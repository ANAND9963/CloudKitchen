const express = require('express');
const userRoutes = express.Router();
const { signup, verifyEmail ,login , createAdmin, getAllUsers ,
    resendVerificationEmail ,searchUsers, promoteToAdmin, demoteAdmin, getMe, updateMe} = require('./userController');
const authenticate = require('./middleware/authenticate');
const authorize = require('./middleware/authorize');
const {updateUserRole} = require('./middleware/updateUserRole');

const {
    forgotPassword,
    verifyOTP,
    resetPassword
} = require('../users/forgotPasswordController');


userRoutes.get('/search', authenticate, authorize('owner'), searchUsers);
userRoutes.post('/admins', authenticate, authorize('owner'), promoteToAdmin);
userRoutes.delete('/admins/:userId', authenticate, authorize('owner'), demoteAdmin);
userRoutes.get('/me', authenticate, getMe);
userRoutes.patch('/me', authenticate, updateMe);

userRoutes.post('/signup', signup);
userRoutes.get('/verify-email', verifyEmail);
userRoutes.post('/login', login);
userRoutes.post('/create-admin',authenticate, authorize('owner'), createAdmin);

userRoutes.get('/allusers', authenticate, authorize('owner','admin'), getAllUsers);

userRoutes.patch('/updated/role', authenticate, authorize('owner'), updateUserRole);

userRoutes.post('/forgot-password', forgotPassword);
userRoutes.post('/verify-otp', verifyOTP);
userRoutes.post('/reset-password', resetPassword);

// Resend verification (works with body.email OR current logged-in user)
userRoutes.post('/resend-verification', authenticate, resendVerificationEmail);
// If you want it to also work for unauthenticated users, add a public route too:
userRoutes.post('/resend-verification-public', resendVerificationEmail);


module.exports = userRoutes;
