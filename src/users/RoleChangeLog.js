const mongoose = require('mongoose');

const RoleChangeLogSchema = new mongoose.Schema({
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    oldRole: String,
    newRole: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RoleChangeLog', RoleChangeLogSchema);
