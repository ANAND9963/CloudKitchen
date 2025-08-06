const jwt = require('jsonwebtoken');
require('dotenv').config();

const jwt_secret = process.env.JWT_SECRET || 'Pavan#9963';

const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]; // Bearer <token>
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    try {
        req.user = jwt.verify(token, jwt_secret); // contains userId and role
        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

module.exports = authenticate;
