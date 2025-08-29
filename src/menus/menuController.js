const MenuItem = require('./menuModel');

exports.listMenus = async (req, res) => {
    try {
        const { q = '', category, available, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (q) filter.title = { $regex: q, $options: 'i' };
        if (category) filter.category = category;
        if (available !== undefined) filter.isAvailable = String(available) !== 'false';

        const pg = Math.max(parseInt(page, 10) || 1, 1);
        const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

        const [items, total] = await Promise.all([
            MenuItem.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim).lean(),
            MenuItem.countDocuments(filter),
        ]);

        res.json({ items, page: pg, limit: lim, total });
    } catch (err) {
        console.error('listMenus error', err);
        res.status(500).json({ message: 'Failed to list menus' });
    }
};

exports.getMenu = async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id).lean();
        if (!item) return res.status(404).json({ message: 'Menu item not found' });
        res.json(item);
    } catch (err) {
        console.error('getMenu error', err);
        res.status(500).json({ message: 'Failed to get menu item' });
    }
};

exports.createMenu = async (req, res) => {
    try {
        const { title, description, price, imageUrl, category, isAvailable } = req.body;
        if (!title || price === undefined) {
            return res.status(400).json({ message: 'title and price are required' });
        }
        const item = await MenuItem.create({
            title, description, price, imageUrl, category,
            isAvailable: isAvailable !== undefined ? !!isAvailable : true,
            createdBy: req.user.userId
        });
        res.status(201).json(item);
    } catch (err) {
        console.error('createMenu error', err);
        res.status(400).json({ message: 'Failed to create menu', detail: err?.message });
    }
};

exports.updateMenu = async (req, res) => {
    try {
        const allowed = ['title','description','price','imageUrl','category','isAvailable'];
        const update = {};
        for (const k of allowed) {
            if (req.body[k] !== undefined) update[k] = req.body[k];
        }
        const item = await MenuItem.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ message: 'Menu item not found' });
        res.json(item);
    } catch (err) {
        console.error('updateMenu error', err);
        res.status(400).json({ message: 'Failed to update menu', detail: err?.message });
    }
};

exports.deleteMenu = async (req, res) => {
    try {
        const item = await MenuItem.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ message: 'Menu item not found' });
        res.json({ message: 'Menu item deleted' });
    } catch (err) {
        console.error('deleteMenu error', err);
        res.status(500).json({ message: 'Failed to delete menu' });
    }
};
