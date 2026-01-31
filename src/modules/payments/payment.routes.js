const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { protect } = require('../auth/auth.middleware');
const coachingScope = require('../../middlewares/coachingScope');
const roleGuard = require('../../middlewares/roleGuard');

// Global protection for all payment routes
router.use(protect);
router.use(coachingScope); // Ensures data is isolated to the center

/**
 * @route   GET /api/v1/payments/history
 * @desc    Get all payment records for the coaching center
 * @access  Private (Admin, Teacher)
 */
router.get('/history', roleGuard('admin', 'teacher'), paymentController.getPaymentHistory);

/**
 * @route   POST /api/v1/payments/collect
 * @desc    Record a new fee collection
 * @access  Private (Admin)
 */
router.post('/collect', roleGuard('admin'), paymentController.collectFee);

/**
 * @route   GET /api/v1/payments/defaulters
 * @desc    Get list of students with unpaid fees
 * @access  Private (Admin, Teacher)
 */
router.get('/defaulters', roleGuard('admin', 'teacher'), paymentController.getDefaulterList);


router.get('/student/:id', paymentController.getStudentPaymentHistory);

module.exports = router;