const express = require('express');
const router = express.Router();
const reportController = require('./report.controller');
const { protect } = require('../auth/auth.middleware');
const coachingScope = require('../../middlewares/coachingScope');
const roleGuard = require('../../middlewares/roleGuard');

router.use(protect);
router.use(coachingScope);
router.use(roleGuard('admin'));

router.get('/students', reportController.downloadStudentReport);
router.get('/defaulters', reportController.downloadDefaulterReport);

module.exports = router;