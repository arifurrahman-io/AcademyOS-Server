const express = require('express');
const router = express.Router();
const subController = require('./subscription.controller');
const { protect } = require('../auth/auth.middleware');
const roleGuard = require('../../middlewares/roleGuard');

// Protect all routes here to Super-Admin only
router.use(protect);
router.use(roleGuard('super-admin'));

router.get('/monitor-all', subController.getAdminDashboard);
router.post('/upgrade-center', subController.manualUpgrade);

module.exports = router;