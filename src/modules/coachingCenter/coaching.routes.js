const express = require("express");
const router = express.Router();

const coachingController = require("./coaching.controller");
const { protect } = require("../auth/auth.middleware");
const roleGuard = require("../../middlewares/roleGuard");
const coachingScope = require("../../middlewares/coachingScope");

/**
 * ─────────────────────────────────────────────
 * PUBLIC ROUTES
 * ─────────────────────────────────────────────
 */

// Node Initialization / Registration
// POST /api/v1/coaching/register
router.post("/register", coachingController.registerCenter);

/**
 * ─────────────────────────────────────────────
 * SUPER ADMIN COMMAND CENTER
 * Global node management & de-provisioning
 * ─────────────────────────────────────────────
 */

// Fetch all centers (used by CentersManagement.jsx)
router.get(
  "/all",
  protect,
  roleGuard("super-admin"),
  coachingController.getAllCenters,
);

// Update center subscription, billing, trial reset
// PUT /api/v1/coaching/:id
router.put(
  "/:id",
  protect,
  roleGuard("super-admin"),
  coachingController.updateCenterStatus,
);

// De-provision coaching node (hard delete + user cleanup)
// DELETE /api/v1/coaching/:id
router.delete(
  "/:id",
  protect,
  roleGuard("super-admin"),
  coachingController.deleteCenter,
);

/**
 * ─────────────────────────────────────────────
 * TENANT-SCOPED ROUTES (Coaching Admin / Staff)
 * Requires authentication + coaching isolation
 * ─────────────────────────────────────────────
 */

// Apply auth protection to all routes below
router.use(protect);

// Update coaching settings (classes, batches, currency, contactNumber)
// PUT /api/v1/coaching/settings
router.put(
  "/settings",
  coachingScope,
  roleGuard("admin"),
  coachingController.updateSettings,
);

// Remove item from settings arrays (class/batch)
// DELETE /api/v1/coaching/settings/:type/:value
router.delete(
  "/settings/:type/:value",
  coachingScope,
  roleGuard("admin"),
  coachingController.removeFromSettings,
);

module.exports = router;
