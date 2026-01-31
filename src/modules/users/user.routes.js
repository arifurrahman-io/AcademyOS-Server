const express = require("express");
const router = express.Router();
const userController = require("./user.controller");
const { protect } = require("../auth/auth.middleware");
const roleGuard = require("../../middlewares/roleGuard");

/**
 * @desc    Authenticated User Profile
 * @route   GET /api/v1/users/me
 */
router.get("/me", protect, userController.getMe);

/**
 * @desc    Staff Management Logic
 * Both routes are restricted to administrative roles.
 */

// Initialize a new staff or teacher node
router.post(
  "/staff",
  protect,
  roleGuard("admin", "super-admin"),
  userController.createStaff,
);

// Fetch all staff members belonging to the requester's coaching_id
router.get(
  "/staff",
  protect,
  roleGuard("admin"),
  userController.getCoachingStaff,
);

/**
 * @desc    Individual User Node Management
 * Standardized CRUD operations for specific user records.
 */

router
  .route("/:id")
  .put(protect, roleGuard("admin", "super-admin"), userController.updateUser)
  .delete(protect, roleGuard("super-admin"), userController.deleteUser);

module.exports = router;
