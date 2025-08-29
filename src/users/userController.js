const User = require('./userModel');
const crypto = require('crypto');
const sendVerificationEmail = require('./utils/sendVerificationEmail'); // you need to implement this
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // Optional if you want JWT login session

const RoleChangeLog = require('./RoleChangeLog');
const jwt_secret = process.env.JWT_SECRET

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const RESEND_COOLDOWN_SEC = Number(process.env.VERIFICATION_RESEND_COOLDOWN_SEC || 120);

exports.signup = async (req, res) => {
    try {
        const { firstName, lastName, email, password, mobileNumber } = req.body;

        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Check if name + mobileNumber combo exists
        const existingUser = await User.findOne({ firstName, lastName, mobileNumber });
        if (existingUser) {
            return res.status(400).json({ message: 'User with same name and mobile number already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create verification token
        const token = crypto.randomBytes(32).toString('hex');

        // Create user but not verified yet
        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            mobileNumber,
            verificationToken: token,
            isVerified: false,
            role: 'user'
        });

        await newUser.save();

        const verificationLink = `http://localhost:5000/api/users/verify-email?token=${token}&email=${email}`;
        await sendVerificationEmail(email, verificationLink);

        res.status(200).json({ message: 'Verification email sent. Please check your inbox.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { token, email } = req.query;

        const user = await User.findOne({ email, verificationToken: token });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.status(200).json({ message: 'Email verified successfully. You can now login.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};



exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find user by email
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid email or password' });

        // 2. Check if email is verified
        if (!user.isVerified) {
            return res.status(403).json({ message: 'Email not verified. Please check your inbox.' });
        }

        // 3. Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

        // 4. (Optional) Create JWT token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            jwt_secret,
            { expiresIn: '1d' }
        );
        // 5. Respond
        res.status(200).json({
            message: 'Login successful',
            token, // only if using JWT
            user: {
                id: user._id,
                firstName: user.firstName,
                email: user.email,
                mobileNumber: user.mobileNumber
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createAdmin = async (req, res) => {
    try {
        const { firstName, lastName, email, password, mobileNumber } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ message: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const token = crypto.randomBytes(32).toString('hex');

        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            mobileNumber,
            verificationToken: token,
            isVerified: false,
            role: 'admin'
        });

        await newUser.save();

        const verificationLink = `http://localhost:5000/api/users/verify-email?token=${token}&email=${email}`;
        await sendVerificationEmail(email, verificationLink);

        res.status(201).json({ message: 'Admin created successfully, email verification sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const userId = req.params.email;
        const { role } = req.body;

        // Prevent upgrading anyone to "owner"
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Allowed: user, admin' });
        }

        const user = await User.findByEmail(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Prevent changing self role or another owner
        if (user.role === 'owner') {
            return res.status(403).json({ message: 'Cannot change role of another owner' });
        }

        user.role = role;
        await user.save();

        res.status(200).json({ message: `User role updated to ${role}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, 'firstName lastName email mobileNumber role');
        res.status(200).json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

// ------------New Code-------------------

exports.searchUsers = async (req, res) => {
    try {
        const { query = '', limit = 5 } = req.query;
        const q = String(query || '').trim();
        const lim = Math.min(parseInt(limit || 5, 10) || 5, 10);

        if (!q) return res.json([]);

        const rx = new RegExp('^' + escapeRegExp(q), 'i');
        const users = await User.find(
            { $or: [{ firstName: rx }, { lastName: rx }] },
            { firstName: 1, lastName: 1, email: 1, role: 1 }
        )
            .limit(lim)
            .lean();

        const result = users.map(u => ({
            _id: u._id,
            fullName: [u.firstName, u.lastName].filter(Boolean).join(' ').trim(),
            email: u.email,
            role: u.role,
        }));

        res.json(result);
    } catch (err) {
        console.error('searchUsers error', err);
        res.status(500).json({ message: 'Failed to search users' });
    }
};

/**
 * POST /api/users/admins
 * body: { userId }  → promote to admin
 * owner only
 */
exports.promoteToAdmin = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: 'userId required' });

        const target = await User.findById(userId);
        if (!target) return res.status(404).json({ message: 'User not found' });
        if (target.role === 'owner') {
            return res.status(403).json({ message: 'Cannot change role of an owner' });
        }

        const oldRole = target.role;
        target.role = 'admin';
        await target.save();

        await RoleChangeLog.create({
            performedBy: req.user.userId,
            targetUser: target._id,
            oldRole,
            newRole: 'admin',
        });

        res.json({ message: 'User promoted to admin', userId: target._id });
    } catch (err) {
        console.error('promoteToAdmin error', err);
        res.status(500).json({ message: 'Failed to promote user' });
    }
};

/**
 * DELETE /api/users/admins/:userId
 * owner only → demote admin to user
 */
exports.demoteAdmin = async (req, res) => {
    try {
        const { userId } = req.params;
        const target = await User.findById(userId);
        if (!target) return res.status(404).json({ message: 'User not found' });
        if (target.role === 'owner') {
            return res.status(403).json({ message: 'Cannot change role of an owner' });
        }

        const oldRole = target.role;
        target.role = 'user';
        await target.save();

        await RoleChangeLog.create({
            performedBy: req.user.userId,
            targetUser: target._id,
            oldRole,
            newRole: 'user',
        });

        res.json({ message: 'Admin demoted to user', userId: target._id });
    } catch (err) {
        console.error('demoteAdmin error', err);
        res.status(500).json({ message: 'Failed to demote user' });
    }
};

/**
 * GET /api/users/me
 */
exports.getMe = async (req, res) => {
    try {
        const me = await User.findById(req.user.userId)
            .select('-password -verificationToken -resetOTP')
            .lean();
        if (!me) return res.status(404).json({ message: 'User not found' });
        res.json(me);
    } catch (err) {
        console.error('getMe error', err);
        res.status(500).json({ message: 'Failed to fetch profile' });
    }
};

/**
 * PATCH /api/users/me
 * body: firstName?, lastName?, mobileNumber?, addresses? (array replace)
 */
exports.updateMe = async (req, res) => {
    try {
        const allowed = ['firstName', 'lastName', 'mobileNumber', 'addresses'];
        const update = {};
        for (const k of allowed) {
            if (req.body[k] !== undefined) update[k] = req.body[k];
        }

        const me = await User.findByIdAndUpdate(
            req.user.userId,
            update,
            { new: true, runValidators: true, select: '-password -verificationToken -resetOTP' }
        );
        res.json(me);
    } catch (err) {
        console.error('updateMe error', err);
        res.status(400).json({ message: 'Failed to update profile', detail: err?.message });
    }
};

exports.resendVerificationEmail = async (req, res) => {
    try {
        let email = req.body?.email?.trim();

        // If authenticated and no email provided, use the logged-in user's email
        if (!email && req.user?.userId) {
            const me = await User.findById(req.user.userId).select('email');
            email = me?.email;
        }

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            // For security we can mask this, but returning explicit helps your flows:
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        // Cooldown check
        const now = Date.now();
        if (user.verificationLastSentAt) {
            const diffSec = Math.floor((now - user.verificationLastSentAt.getTime()) / 1000);
            if (diffSec < RESEND_COOLDOWN_SEC) {
                return res.status(429).json({
                    message: `Please wait ${RESEND_COOLDOWN_SEC - diffSec}s before requesting another email`
                });
            }
        }

        // Generate a fresh token
        const token = crypto.randomBytes(32).toString('hex');
        user.verificationToken = token;
        user.verificationLastSentAt = new Date(now);
        user.verificationResendCount = (user.verificationResendCount || 0) + 1;
        await user.save();

        // Link your frontend page (nice UX). That page already calls GET /api/users/verify-email under the hood.
        const verifyLink = `${FRONTEND_URL}/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

        await sendVerificationEmail(email, verifyLink);

        return res.status(200).json({ message: 'Verification email resent. Please check your inbox.' });
    } catch (err) {
        console.error('resendVerificationEmail error', err);
        return res.status(500).json({ message: 'Failed to resend verification email' });
    }
};


