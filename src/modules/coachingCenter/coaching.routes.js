const express = require("express");
const router = express.Router();
const coachingController = require("./coaching.controller");
const { protect } = require("../auth/auth.middleware");
const roleGuard = require("../../middlewares/roleGuard");
const coachingScope = require("../../middlewares/coachingScope");

/**
 * PUBLIC ROUTES
 * Node Initialization
 */
router.post("/register", coachingController.registerCenter);

/**
 * SUPER-ADMIN ROUTES
 * Global node management and license control
 */

// Fetch merged data from 'coachingcenters' and 'users' collections
router.get(
  "/all",
  protect,
  roleGuard("super-admin"),
  coachingController.getAllCenters,
);

// Update subscriptionStatus, paymentProcessed, or deactivate nodes
router.put(
  "/:id",
  protect,
  roleGuard("super-admin"),
  coachingController.updateCenterStatus,
);

/**
 * COACHING ADMIN ROUTES (Tenant-Specific)
 * Requires 'protect' for auth and 'coachingScope' for data isolation
 */
router.use(protect);

// These routes require the coachingScope middleware to identify the center node
router.use(coachingScope);

// @route   PUT /api/v1/coaching/settings
// @desc    Update registry arrays (Classes & Batches)
router.put("/settings", roleGuard("admin"), coachingController.updateSettings);

// @route   DELETE /api/v1/coaching/settings/:type/:value
// @desc    Remove a specific data node from settings
router.delete(
  "/settings/:type/:value",
  roleGuard("admin"),
  coachingController.removeFromSettings,
);

module.exports = router;
