// CloudKitchen/src/cart/cartController.js
const Cart = require('./cartModel');
const MenuItem = require('../menus/menuModel');

async function ensureCart(userId) {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = await Cart.create({ user: userId, items: [] });
    return cart;
}

exports.getCart = async (req, res) => {
    try {
        const cart = await (await ensureCart(req.user.userId))
            .populate({ path: 'items.menuItem', select: 'title price imageUrl isAvailable' });
        res.json(cart);
    } catch (err) {
        console.error('getCart error', err);
        res.status(500).json({ message: 'Failed to fetch cart' });
    }
};

exports.addItem = async (req, res) => {
    try {
        const { menuItemId, qty = 1 } = req.body;
        if (!menuItemId) return res.status(400).json({ message: 'menuItemId required' });
        const item = await MenuItem.findById(menuItemId);
        if (!item) return res.status(404).json({ message: 'Menu item not found' });

        const cart = await ensureCart(req.user.userId);
        const idx = cart.items.findIndex(i => String(i.menuItem) === String(menuItemId));
        if (idx >= 0) {
            cart.items[idx].qty += Number(qty || 1);
        } else {
            cart.items.push({ menuItem: menuItemId, qty: Math.max(1, Number(qty || 1)) });
        }
        await cart.save();
        await cart.populate({ path: 'items.menuItem', select: 'title price imageUrl isAvailable' });
        res.status(201).json(cart);
    } catch (err) {
        console.error('addItem error', err);
        res.status(400).json({ message: 'Failed to add item', detail: err?.message });
    }
};

exports.updateQty = async (req, res) => {
    try {
        const { qty } = req.body;
        const { menuItemId } = req.params;
        const cart = await ensureCart(req.user.userId);

        const idx = cart.items.findIndex(i => String(i.menuItem) === String(menuItemId));
        if (idx < 0) return res.status(404).json({ message: 'Item not in cart' });

        const n = Number(qty);
        if (!Number.isFinite(n)) return res.status(400).json({ message: 'qty must be a number' });
        if (n <= 0) {
            cart.items.splice(idx, 1);
        } else {
            cart.items[idx].qty = Math.floor(n);
        }
        await cart.save();
        await cart.populate({ path: 'items.menuItem', select: 'title price imageUrl isAvailable' });
        res.json(cart);
    } catch (err) {
        console.error('updateQty error', err);
        res.status(400).json({ message: 'Failed to update quantity', detail: err?.message });
    }
};

exports.removeItem = async (req, res) => {
    try {
        const { menuItemId } = req.params;
        const cart = await ensureCart(req.user.userId);
        const before = cart.items.length;
        cart.items = cart.items.filter(i => String(i.menuItem) !== String(menuItemId));
        if (cart.items.length === before) {
            return res.status(404).json({ message: 'Item not in cart' });
        }
        await cart.save();
        await cart.populate({ path: 'items.menuItem', select: 'title price imageUrl isAvailable' });
        res.json(cart);
    } catch (err) {
        console.error('removeItem error', err);
        res.status(500).json({ message: 'Failed to remove item' });
    }
};
