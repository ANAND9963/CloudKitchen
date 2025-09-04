const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
    {
        menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        title: { type: String, required: true },     // snapshot
        price: { type: Number, required: true },     // snapshot
        qty:   { type: Number, required: true, min: 1 },
        imageUrl: String,
    },
    { _id: false }
);

const AddressSchema = new mongoose.Schema(
    {
        fullName: String,
        phone: String,
        line1: String,
        line2: String,
        city: String,
        state: String,
        postalCode: String,
    },
    { _id: false }
);

const OrderSchema = new mongoose.Schema(
    {
        user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        items:  { type: [OrderItemSchema], default: [] },

        method: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
        address: AddressSchema,                       // snapshot for delivery
        addressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' }, // optional if you store addresses

        scheduleAt: { type: Date },

        // money
        subtotal:    { type: Number, required: true },
        deliveryFee: { type: Number, required: true },
        serviceFee:  { type: Number, required: true },
        tax:         { type: Number, required: true },
        discount:    { type: Number, required: true, default: 0 },
        total:       { type: Number, required: true },

        status: {
            type: String,
            enum: ['pending','placed','accepted','prepping','ready','completed','cancelled'],
            default: 'pending'
        },
        paymentStatus: {
            type: String,
            enum: ['unpaid','authorized','paid','refunded','failed'],
            default: 'unpaid'
        },

        paymentMethodId: String,   // stored for later (Stripe/Razorpay), not used yet
        paymentRef: String
    },
    { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
