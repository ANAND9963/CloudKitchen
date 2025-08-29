// CloudKitchen/src/menus/menuRoutes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../users/middleware/authenticate');
const authorize = require('../users/middleware/authorize');
const {
    listMenus, getMenu, createMenu, updateMenu, deleteMenu
} = require('./menuController');

// public reads
router.get('/', listMenus);
router.get('/:id', getMenu);

// owner/admin writes
router.post('/', authenticate, authorize('owner','admin'), createMenu);
router.patch('/:id', authenticate, authorize('owner','admin'), updateMenu);
router.delete('/:id', authenticate, authorize('owner','admin'), deleteMenu);

module.exports = router;
