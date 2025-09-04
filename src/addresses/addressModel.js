const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        label: { type: String, default: 'Home' }, // e.g., Home, Work, Other

        fullName: { type: String, required: true },
        phone:    { type: String, required: true },

        line1: { type: String, required: true },
        line2: { type: String },
        city:  { type: String, required: true },
        state: { type: String, required: true },
        postalCode: { type: String, required: true },

        isDefault: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

AddressSchema.index({ user: 1, isDefault: 1 });

module.exports = mongoose.model('Address', AddressSchema);
