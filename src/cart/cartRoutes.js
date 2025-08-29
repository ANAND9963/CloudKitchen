const express = require('express');
const router = express.Router();
const authenticate = require('../users/middleware/authenticate');
const { getCart, addItem, updateQty, removeItem } = require('./cartController');

router.use(authenticate);

router.get('/', getCart);
router.post('/items', addItem);
router.patch('/items/:menuItemId', updateQty);
router.delete('/items/:menuItemId', removeItem);

module.exports = router;