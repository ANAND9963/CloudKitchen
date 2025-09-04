const express = require('express');
const router = express.Router();
const authenticate = require('../users/middleware/authenticate');
const { checkout, listOrders, getOrder, cancelOrder } = require('./orderController');

router.use(authenticate);

router.post('/checkout', checkout);

router.get('/orders', listOrders);
router.get('/orders/:id', getOrder);
router.post('/orders/:id/cancel', cancelOrder);

module.exports = router;