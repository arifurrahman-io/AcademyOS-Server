const express = require("express");
const router = express.Router();

const coachingController = require("./coaching.controller");
const { protect } = require("../auth/auth.middleware");
const roleGuard = require("../../middlewares/roleGuard");
const coachingScope = require("../../middlewares/coachingScope");
const mongoose = require("mongoose");
const subscriptionGuard = require("../../middlewares/subscriptionGuard");

/**
 * Role constants
 */
const ROLES = Object.freeze({
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  TEACHER: "teacher",
  STAFF: "staff",
});

/**
 * Validate ObjectId param middleware
 */
const validateObjectIdParam =
  (paramName = "id") =>
  (req, res, next) => {
    const value = req.params?.[paramName];

    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}`,
      });
    }

    return next();
  };

/**
 * ─────────────────────────────────────────────
 * PUBLIC ROUTES
 * ─────────────────────────────────────────────
 */

// POST /api/v1/coaching/register
router.post("/register", coachingController.registerCenter);

/**
 * ─────────────────────────────────────────────
 * AUTH REQUIRED ROUTES
 * ─────────────────────────────────────────────
 */
router.use(protect);

/**
 * ─────────────────────────────────────────────
 * TENANT-SCOPED ROUTES (Admin / Support)
 * IMPORTANT: Static routes BEFORE "/:id"
 * ─────────────────────────────────────────────
 */

// PUT /api/v1/coaching/settings
router.put(
  "/settings",
  coachingScope,
  subscriptionGuard,
  roleGuard(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  coachingController.updateSettings,
);

// DELETE /api/v1/coaching/settings/:type/:value
router.delete(
  "/settings/:type/:value",
  coachingScope,
  subscriptionGuard,
  roleGuard(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  coachingController.removeFromSettings,
);

/**
 * ─────────────────────────────────────────────
 * SUPER ADMIN COMMAND CENTER
 * ─────────────────────────────────────────────
 */

// GET /api/v1/coaching/all
router.get(
  "/all",
  roleGuard(ROLES.SUPER_ADMIN),
  coachingController.getAllCenters,
);

// PUT /api/v1/coaching/:id
router.put(
  "/:id",
  validateObjectIdParam("id"),
  roleGuard(ROLES.SUPER_ADMIN),
  coachingController.updateCenterStatus,
);

// DELETE /api/v1/coaching/:id
router.delete(
  "/:id",
  validateObjectIdParam("id"),
  roleGuard(ROLES.SUPER_ADMIN),
  coachingController.deleteCenter,
);

module.exports = router;
