const Order = require('./orderModel');
const Cart = require('../cart/cartModel');
const Address = require('../addresses/addressModel');

const DELIVERY_FEE_FLAT = 4.99;
const SERVICE_FEE_RATE  = 0.05;
const TAX_RATE          = 0.08;
const r2 = (n) => Math.round(n * 100) / 100;

exports.checkout = async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1) Cart
        const cart = await Cart.findOne({ user: userId }).populate({
            path: 'items.menuItem',
            select: 'title price imageUrl isAvailable'
        });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Your cart is empty.' });
        }

        // 2) Snapshot items
        const items = [];
        for (const it of cart.items) {
            const m = it.menuItem;
            if (!m) continue;
            items.push({ menuItemId: m._id, title: m.title, price: Number(m.price), qty: Number(it.qty || 1), imageUrl: m.imageUrl });
        }
        if (items.length === 0) {
            return res.status(400).json({ message: 'No valid items to checkout.' });
        }

        // 3) Totals
        const subtotal = r2(items.reduce((s, x) => s + x.price * x.qty, 0));
        const method = req.body.method === 'pickup' ? 'pickup' : 'delivery';
        const deliveryFee = r2(method === 'pickup' ? 0 : DELIVERY_FEE_FLAT);
        const serviceFee  = r2(subtotal * SERVICE_FEE_RATE);
        const tax         = r2(subtotal * TAX_RATE);
        const discount    = 0;
        const total       = r2(subtotal + deliveryFee + serviceFee + tax - discount);

        // 4) Address resolution
        let addressSnapshot = undefined;
        let addressIdToSave = req.body.addressId || undefined;

        if (method === 'delivery') {
            if (addressIdToSave) {
                // Use a saved address (must belong to the user)
                const saved = await Address.findOne({ _id: addressIdToSave, user: userId });
                if (!saved) return res.status(400).json({ message: 'Address not found.' });

                addressSnapshot = {
                    label: saved.label,
                    fullName: saved.fullName,
                    phone: saved.phone,
                    line1: saved.line1,
                    line2: saved.line2,
                    city: saved.city,
                    state: saved.state,
                    postalCode: saved.postalCode,
                };
            } else if (req.body.address) {
                // Use raw address from body
                const a = req.body.address;
                const required = ['fullName','phone','line1','city','state','postalCode'];
                for (const k of required) {
                    if (!String(a[k] || '').trim()) {
                        return res.status(400).json({ message: 'Delivery address incomplete.' });
                    }
                }
                addressSnapshot = {
                    label: a.label || 'Home',
                    fullName: a.fullName,
                    phone: a.phone,
                    line1: a.line1,
                    line2: a.line2,
                    city: a.city,
                    state: a.state,
                    postalCode: a.postalCode,
                };

                // Optionally save to address book
                if (req.body.saveAddress === true) {
                    const existingCount = await Address.countDocuments({ user: userId });
                    const isDefault = existingCount === 0 ? true : !!a.isDefault;
                    const savedNew = await Address.create({
                        user: userId,
                        ...addressSnapshot,
                        isDefault
                    });
                    addressIdToSave = savedNew._id;

                    if (isDefault && existingCount > 0) {
                        await Address.updateMany({ user: userId, _id: { $ne: savedNew._id } }, { $set: { isDefault: false } });
                    }
                }
            } else {
                return res.status(400).json({ message: 'Delivery address required.' });
            }
        }

        // 5) Create order
        const order = await Order.create({
            user: userId,
            items,
            method,
            address: addressSnapshot,
            addressId: addressIdToSave,
            scheduleAt: req.body.scheduleAt || undefined,
            subtotal, deliveryFee, serviceFee, tax, discount, total,
            status: 'pending',
            paymentStatus: 'unpaid',
            paymentMethodId: req.body.paymentMethodId || undefined
        });

        // 6) Clear cart
        cart.items = [];
        await cart.save();

        res.status(201).json({
            message: 'Order created.',
            order: {
                _id: order._id,
                status: order.status,
                paymentStatus: order.paymentStatus,
                totals: { subtotal, deliveryFee, serviceFee, tax, discount, total },
                addressId: order.addressId,
            }
        });
    } catch (err) {
        console.error('checkout error', err);
        res.status(500).json({ message: 'Checkout failed' });
    }
};


/**
 * GET /api/orders
 * - Users: only their orders
 * - Admin/Owner: can filter (?user=&status=&from=&to=&page=&limit=)
 */
exports.listOrders = async (req, res) => {
    try {
        const { role, userId } = req.user;
        const query = {};

        if (role === 'admin' || role === 'owner') {
            if (req.query.user)   query.user = req.query.user;
            if (req.query.status) query.status = req.query.status;
            if (req.query.from || req.query.to) {
                query.createdAt = {};
                if (req.query.from) query.createdAt.$gte = new Date(req.query.from);
                if (req.query.to)   query.createdAt.$lte = new Date(req.query.to);
            }
        } else {
            query.user = userId;
        }

        const page  = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
        const skip  = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            (await Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)),
            Order.countDocuments(query)
        ]);

        res.json({ page, limit, total, orders });
    } catch (err) {
        console.error('listOrders error', err);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
};

/**
 * GET /api/orders/:id
 * - Users: only their own
 * - Admin/Owner: any
 */
exports.getOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const isStaff = ['admin','owner'].includes(req.user.role);
        if (!isStaff && String(order.user) !== String(req.user.userId)) {
            return res.status(403).json({ message: 'Not allowed' });
        }

        res.json({ order });
    } catch (err) {
        console.error('getOrder error', err);
        res.status(500).json({ message: 'Failed to fetch order' });
    }
};

/**
 * POST /api/orders/:id/cancel
 * - Allowed when status in ['pending','placed','accepted']
 * - (Refund flow will be wired when payments are added)
 */
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const isStaff = ['admin','owner'].includes(req.user.role);
        const isOwn   = String(order.user) === String(req.user.userId);
        if (!isOwn && !isStaff) {
            return res.status(403).json({ message: 'Not allowed' });
        }

        if (!['pending','placed','accepted'].includes(order.status)) {
            return res.status(400).json({ message: `Cannot cancel order in status "${order.status}"` });
        }

        order.status = 'cancelled';
        await order.save();

        res.json({ message: 'Order cancelled.', order });
    } catch (err) {
        console.error('cancelOrder error', err);
        res.status(500).json({ message: 'Failed to cancel order' });
    }
};
