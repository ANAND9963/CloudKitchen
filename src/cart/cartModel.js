
const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    qty: { type: Number, default: 1, min: 1 }
}, { _id: false });

const CartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
    items: [CartItemSchema]
}, { timestamps: true });

CartSchema.index({ user: 1 });

module.exports = mongoose.model('Cart', CartSchema);
