const express = require('express');
const router = express.Router();

// Import Module Routes
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const coachingRoutes = require('./modules/coachingCenter/coaching.routes');
const studentRoutes = require('./modules/students/student.routes');
const paymentRoutes = require('./modules/payments/payment.routes');
const reportRoutes = require('./modules/reports/report.routes');
const subscriptionRoutes = require('./modules/subscriptions/subscription.routes');

/**
 * Main Router Map
 * All routes here are prefixed with /api/v1 in app.js
 */

// 1. Authentication & Identity
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// 2. Multi-Tenant Core (Coaching Centers & Subs)
router.use('/coaching', coachingRoutes);
router.use('/subscriptions', subscriptionRoutes);

// 3. Operational Modules (Tenant Scoped)
router.use('/students', studentRoutes);
router.use('/payments', paymentRoutes);

// 4. Data Export & Printing
router.use('/reports', reportRoutes);

// Health Check Route (Useful for server monitoring/Android pings)
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'active', 
    time: new Date().toISOString(),
    timezone: 'Asia/Dhaka' 
  });
});

module.exports = router;