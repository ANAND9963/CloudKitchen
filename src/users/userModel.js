// CloudKitchen/src/users/userModel.js
const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
    label: { type: String },
    line1: { type: String },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String, default: 'US' },
    isDefault: { type: Boolean, default: false }
}, { _id: false });

// ...existing imports and schema above

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: { type: String, required: true, unique: true },
    mobileNumber: { type: String, required: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: String,

    verificationLastSentAt: { type: Date },
    verificationResendCount: { type: Number, default: 0 },

    role: { type: String, enum: ['owner','admin','user'], default: 'user' },
    resetOTP: { code: String, expiresAt: Date },
    addresses: [
        {
            label: String,
            line1: String,
            line2: String,
            city: String,
            state: String,
            postalCode: String,
            country: { type: String, default: 'US' },
            isDefault: { type: Boolean, default: false }
        }
    ]
}, { timestamps: true });

// Keep your existing indexes
userSchema.index({ firstName: 1, lastName: 1 });

module.exports = mongoose.model('User', userSchema);

