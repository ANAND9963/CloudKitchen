const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
    title: { type: String, required: true, index: true },
    description: String,
    price: { type: Number, required: true, min: 0 },
    imageUrl: String,
    category: { type: String, index: true },
    isAvailable: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', MenuItemSchema,'menuitems');
