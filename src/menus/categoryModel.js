const mongoose = require('mongoose');

const MenuCategorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, unique: true },
        slug: { type: String, required: true, trim: true, unique: true },
        order: { type: Number, default: 0, index: true },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

module.exports = mongoose.model('MenuCategory', MenuCategorySchema);
