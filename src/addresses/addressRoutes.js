const express = require('express');
const router = express.Router();
const authenticate = require('../users/middleware/authenticate');
const ctrl = require('./addressController');

router.use(authenticate);

// CRUD
router.get('/addresses', ctrl.listAddresses);
router.post('/addresses', ctrl.createAddress);
router.get('/addresses/default', ctrl.getDefaultAddress);
router.get('/addresses/:id', ctrl.getAddress);
router.put('/addresses/:id', ctrl.updateAddress);
router.delete('/addresses/:id', ctrl.deleteAddress);

// set default
router.patch('/addresses/:id/default', ctrl.setDefaultAddress);

module.exports = router;
