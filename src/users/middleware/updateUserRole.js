const User = require('../userModel');
const RoleChangeLog = require('../RoleChangeLog');

exports.updateUserRole = async (req, res) => {
    try {
        const { email, role } = req.body;
        const currentUserId = req.user.userId;

        if (!email || !role) {
            return res.status(400).json({ message: 'Email and role are required' });
        }

        // Validate role
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Allowed: user, admin' });
        }

        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findOne({ email: email.toLowerCase() });

        if (!targetUser) {
            return res.status(404).json({ message: 'Target user not found' });
        }

        if (currentUser.email === targetUser.email) {
            return res.status(403).json({ message: 'You cannot change your own role' });
        }

        if (targetUser.role === 'owner') {
            return res.status(403).json({ message: 'Cannot change role of another owner' });
        }

        const oldRole = targetUser.role;
        targetUser.role = role;
        await targetUser.save();

        // Log role change
        const log = new RoleChangeLog({
            performedBy: currentUser._id,
            targetUser: targetUser._id,
            oldRole,
            newRole: role
        });
        await log.save();

        res.status(200).json({
            message: `Role updated successfully from ${oldRole} to ${role}`,
            user: {
                id: targetUser._id,
                email: targetUser.email,
                role: targetUser.role
            }
        });

    } catch (err) {
        console.error('Update Role Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
