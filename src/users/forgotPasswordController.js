const nodemailer = require('nodemailer');
const User = require('./userModel');
const bcrypt = require('bcryptjs');

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User Email not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    user.resetOTP = { code: otp, expiresAt: expires };
    await user.save();

    // Send email
    const transporter = nodemailer.createTransport({
        service: 'Gmail', // or any provider
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"CloudKitchen" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset OTP',
        html: `<p>Your OTP for password reset is <b>${otp}</b>. It is valid for 10 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'OTP sent to email' });
};

const validateOTP = async (email, otp) => {
    const user = await User.findOne({ email });

    if (!user || !user.resetOTP || user.resetOTP.code !== otp) {
        return { valid: false, message: 'Invalid OTP' };
    }

    if (user.resetOTP.expiresAt < Date.now()) {
        return { valid: false, message: 'OTP expired' };
    }

    return { valid: true, user };
};

exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    const { valid, message } = await validateOTP(email, otp);
    if (!valid) return res.status(400).json({ message });

    res.status(200).json({ message: 'OTP verified' });
};


exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    const { valid, message, user } = await validateOTP(email, otp);
    if (!valid) return res.status(400).json({ message });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOTP = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
};
