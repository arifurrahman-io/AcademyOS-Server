const express = require("express");
const router = express.Router();

// Import Module Routes
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/user.routes");
const coachingRoutes = require("./modules/coachingCenter/coaching.routes");
const studentRoutes = require("./modules/students/student.routes");
const paymentRoutes = require("./modules/payments/payment.routes");
const reportRoutes = require("./modules/reports/report.routes");
const subscriptionRoutes = require("./modules/subscriptions/subscription.routes");

// Import Security Middlewares
const { protect } = require("./middlewares/auth");
const coachingScope = require("./middlewares/coachingScope");

/**
 * Main Router Map
 * All routes here are prefixed with /api/v1 in app.js
 */

// --- 1. Public & Identity Routes ---
// Auth handles login and center registration
router.use("/auth", authRoutes);

// --- 2. Multi-Tenant Core (Administrative) ---
// Scoped by Super-Admin or Coaching Admin
router.use("/coaching", coachingRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/users", userRoutes);

// --- 3. Operational Modules (Strictly Tenant Scoped) ---
// We apply 'protect' and 'coachingScope' here to ensure
// data isolation between different coaching centers.
router.use("/students", protect, coachingScope, studentRoutes);
router.use("/payments", protect, coachingScope, paymentRoutes);

// --- 4. Data Export & Printing ---
router.use("/reports", protect, coachingScope, reportRoutes);

/**
 * Health Check & Environment Monitoring
 * Useful for Android pings and server status monitoring.
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "active",
    node: "AcademyOS-Central-01",
    timestamp: new Date().toISOString(),
    timezone: "Asia/Dhaka",
  });
});

/**
 * Router-Level 404 Handler
 * Catches any /api/v1/... calls that don't match the routes above.
 */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route [${req.method}] ${req.originalUrl} not recognized.`,
  });
});

module.exports = router;
