const express = require('express');
const userRoutes = express.Router();
const { signup, verifyEmail ,login , createAdmin, getAllUsers} = require('./userController');
const authenticate = require('./middleware/authenticate');
const authorize = require('./middleware/authorize');
const {updateUserRole} = require('./middleware/updateUserRole');


userRoutes.post('/signup', signup);
userRoutes.get('/verify-email', verifyEmail);
userRoutes.post('/login', login);
userRoutes.post('/create-admin',authenticate, authorize('owner'), createAdmin);

userRoutes.get('/allusers', authenticate, authorize('owner','admin'), getAllUsers);

userRoutes.patch('/updated/role', authenticate, authorize('owner'), updateUserRole);

module.exports = userRoutes;
