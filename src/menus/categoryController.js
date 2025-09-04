const MenuCategory = require('./categoryModel');

const DEFAULTS = [
    { name: 'Soups' },
    { name: 'Appetizers (Veg)' },
    { name: 'Appetizers (Non-Veg)' },
    { name: 'Entree (Veg)' },
    { name: 'Entree (Non-Veg)' },
    { name: 'Main Course' },
    { name: 'Desserts' },
    { name: 'Drinks' },
];

const slugify = (s) =>
    String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

const isStaff = (req) => ['admin', 'owner'].includes(req?.user?.role);

exports.list = async (req, res) => {
    try {
        // auto-seed once
        const count = await MenuCategory.countDocuments();
        if (count === 0) {
            const rows = DEFAULTS.map((d, i) => ({
                name: d.name,
                slug: slugify(d.name),
                order: i,
                isActive: true
            }));
            await MenuCategory.insertMany(rows);
        }

        const cats = await MenuCategory.find({}).sort({ order: 1, name: 1 });
        res.json({ categories: cats });
    } catch (err) {
        console.error('categories.list error', err);
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
};

exports.create = async (req, res) => {
    try {
        if (!isStaff(req)) return res.status(403).json({ message: 'Not allowed' });

        const { name, order, isActive } = req.body || {};
        if (!String(name || '').trim()) {
            return res.status(400).json({ message: 'Name is required' });
        }
        const slug = slugify(name);
        const exists = await MenuCategory.findOne({ $or: [{ name }, { slug }] });
        if (exists) return res.status(409).json({ message: 'Category already exists' });

        const max = await MenuCategory.findOne().sort({ order: -1 }).select('order');
        const cat = await MenuCategory.create({
            name,
            slug,
            order: typeof order === 'number' ? order : (max?.order ?? 0) + 1,
            isActive: isActive !== false
        });
        res.status(201).json({ category: cat });
    } catch (err) {
        console.error('categories.create error', err);
        res.status(500).json({ message: 'Failed to create category' });
    }
};

exports.update = async (req, res) => {
    try {
        if (!isStaff(req)) return res.status(403).json({ message: 'Not allowed' });

        const { id } = req.params;
        const patch = {};
        if (typeof req.body.name === 'string' && req.body.name.trim()) {
            patch.name = req.body.name.trim();
            patch.slug = slugify(req.body.name);
        }
        if (typeof req.body.order === 'number') patch.order = req.body.order;
        if (typeof req.body.isActive === 'boolean') patch.isActive = req.body.isActive;

        const cat = await MenuCategory.findByIdAndUpdate(id, { $set: patch }, { new: true });
        if (!cat) return res.status(404).json({ message: 'Category not found' });
        res.json({ category: cat });
    } catch (err) {
        console.error('categories.update error', err);
        res.status(500).json({ message: 'Failed to update category' });
    }
};

exports.remove = async (req, res) => {
    try {
        if (!isStaff(req)) return res.status(403).json({ message: 'Not allowed' });

        const { id } = req.params;
        const cat = await MenuCategory.findByIdAndDelete(id);
        if (!cat) return res.status(404).json({ message: 'Category not found' });

        res.json({ message: 'Category deleted' });
    } catch (err) {
        console.error('categories.remove error', err);
        res.status(500).json({ message: 'Failed to delete category' });
    }
};

exports.reorder = async (req, res) => {
    try {
        if (!isStaff(req)) return res.status(403).json({ message: 'Not allowed' });

        const { order = [] } = req.body; // [{_id, order}, ...]
        if (!Array.isArray(order)) return res.status(400).json({ message: 'Invalid order payload' });

        const ops = order.map((o) => ({
            updateOne: {
                filter: { _id: o._id },
                update: { $set: { order: Number(o.order) || 0 } }
            }
        }));
        if (ops.length) await MenuCategory.bulkWrite(ops);

        const cats = await MenuCategory.find({}).sort({ order: 1, name: 1 });
        res.json({ categories: cats });
    } catch (err) {
        console.error('categories.reorder error', err);
        res.status(500).json({ message: 'Failed to reorder categories' });
    }
};
