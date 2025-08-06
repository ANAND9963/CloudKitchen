const nodemailer = require('nodemailer');

const sendVerificationEmail = async (email, link) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS// Use App Password, not your Gmail password
        }
    });

    const mailOptions = {
        from: `"CloudKitchen" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify your email',
        html: `<p>Click the link below to verify your email:</p><a href="${link}">Verify Email</a>`
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendVerificationEmail;
