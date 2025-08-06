const User = require('./userModel');
const crypto = require('crypto');
const sendVerificationEmail = require('./utils/sendVerificationEmail'); // you need to implement this
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // Optional if you want JWT login session

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



const jwt_secret = process.env.JWT_SECRET
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



