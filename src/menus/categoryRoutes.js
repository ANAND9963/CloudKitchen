const express = require('express');
const router = express.Router();
const authenticate = require('../users/middleware/authenticate'); // your auth
const ctrl = require('./categoryController');

router.get('/menu-categories', ctrl.list);

router.use(authenticate); // from here, write-protected
router.post('/menu-categories', ctrl.create);
router.put('/menu-categories/:id', ctrl.update);
router.delete('/menu-categories/:id', ctrl.remove);
router.post('/menu-categories/reorder', ctrl.reorder);

module.exports = router;
