const express = require("express");
const router = express.Router();
const subController = require("./subscription.controller");
const { protect } = require("../auth/auth.middleware");
const roleGuard = require("../../middlewares/roleGuard");

/**
 * @desc    Subscription & License Management
 * Scoped by Super-Admin (Global) and Coaching Admin (Tenant-Specific)
 */

// All subscription routes require a valid JWT token
router.use(protect);

/**
 * @route   GET /api/v1/subscriptions/monitor-all
 * @desc    Global overview of all institute subscription statuses
 * @access  Private (Super-Admin Only)
 */
router.get(
  "/monitor-all",
  roleGuard("super-admin"),
  subController.getAdminDashboard,
);

/**
 * @route   POST /api/v1/subscriptions/upgrade-center
 * @desc    Coaching Admins submit payment proof; Super-Admins can manually execute upgrades
 * @access  Private (Admin, Super-Admin)
 */
router.post(
  "/upgrade-center",
  roleGuard("admin", "super-admin"),
  subController.manualUpgrade,
);

module.exports = router;
