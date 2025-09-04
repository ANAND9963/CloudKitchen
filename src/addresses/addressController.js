const Address = require('./addressModel');

const requiredFields = ['fullName', 'phone', 'line1', 'city', 'state', 'postalCode'];

const pickAddressFields = (src = {}) => ({
    label: src.label,
    fullName: src.fullName,
    phone: src.phone,
    line1: src.line1,
    line2: src.line2,
    city: src.city,
    state: src.state,
    postalCode: src.postalCode,
});

exports.createAddress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const data = pickAddressFields(req.body);

        // validate required
        for (const k of requiredFields) {
            if (!String(data[k] || '').trim()) {
                return res.status(400).json({ message: `Missing field: ${k}` });
            }
        }

        // If this is user's first address, force default=true
        const existingCount = await Address.countDocuments({ user: userId });
        const isDefault = existingCount === 0 ? true : !!req.body.isDefault;

        const addr = await Address.create({ ...data, user: userId, isDefault });

        // If explicitly default, unset previous defaults
        if (isDefault && existingCount > 0) {
            await Address.updateMany({ user: userId, _id: { $ne: addr._id } }, { $set: { isDefault: false } });
        }

        res.status(201).json({ address: addr });
    } catch (err) {
        console.error('createAddress error', err);
        res.status(500).json({ message: 'Failed to create address' });
    }
};

exports.listAddresses = async (req, res) => {
    try {
        const userId = req.user.userId;
        const addrs = await Address.find({ user: userId })
            .sort({ isDefault: -1, updatedAt: -1, createdAt: -1 });
        res.json({ addresses: addrs });
    } catch (err) {
        console.error('listAddresses error', err);
        res.status(500).json({ message: 'Failed to fetch addresses' });
    }
};

exports.getAddress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const addr = await Address.findOne({ _id: req.params.id, user: userId });
        if (!addr) return res.status(404).json({ message: 'Address not found' });
        res.json({ address: addr });
    } catch (err) {
        console.error('getAddress error', err);
        res.status(500).json({ message: 'Failed to fetch address' });
    }
};

exports.updateAddress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const updates = pickAddressFields(req.body);
        const addr = await Address.findOneAndUpdate(
            { _id: req.params.id, user: userId },
            { $set: updates },
            { new: true }
        );
        if (!addr) return res.status(404).json({ message: 'Address not found' });

        // If body sets isDefault true, promote this and demote others
        if (req.body.isDefault === true) {
            await Address.updateMany({ user: userId, _id: { $ne: addr._id } }, { $set: { isDefault: false } });
            if (!addr.isDefault) {
                addr.isDefault = true;
                await addr.save();
            }
        }

        res.json({ address: addr });
    } catch (err) {
        console.error('updateAddress error', err);
        res.status(500).json({ message: 'Failed to update address' });
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const addr = await Address.findOneAndDelete({ _id: req.params.id, user: userId });
        if (!addr) return res.status(404).json({ message: 'Address not found' });

        // If deleted default, promote the most recent remaining to default (if any)
        if (addr.isDefault) {
            const next = await Address.findOne({ user: userId }).sort({ updatedAt: -1, createdAt: -1 });
            if (next) {
                next.isDefault = true;
                await next.save();
            }
        }

        res.json({ message: 'Address deleted' });
    } catch (err) {
        console.error('deleteAddress error', err);
        res.status(500).json({ message: 'Failed to delete address' });
    }
};

exports.setDefaultAddress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = req.params.id;

        const addr = await Address.findOne({ _id: id, user: userId });
        if (!addr) return res.status(404).json({ message: 'Address not found' });

        await Address.updateMany({ user: userId, _id: { $ne: id } }, { $set: { isDefault: false } });
        addr.isDefault = true;
        await addr.save();

        res.json({ address: addr });
    } catch (err) {
        console.error('setDefaultAddress error', err);
        res.status(500).json({ message: 'Failed to set default address' });
    }
};

exports.getDefaultAddress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const addr = await Address.findOne({ user: userId, isDefault: true });
        if (!addr) return res.status(404).json({ message: 'No default address set' });
        res.json({ address: addr });
    } catch (err) {
        console.error('getDefaultAddress error', err);
        res.status(500).json({ message: 'Failed to fetch default address' });
    }
};
