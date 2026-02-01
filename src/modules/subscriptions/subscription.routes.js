const express = require("express");
const router = express.Router();

const subscriptionController = require("./subscription.controller");
const { protect } = require("../auth/auth.middleware");
const roleGuard = require("../../middlewares/roleGuard");
const coachingScope = require("../../middlewares/coachingScope");

/**
 * Role constants
 */
const ROLES = Object.freeze({
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
});

/**
 * ✅ Coaching Admin Routes
 * - trial expire হলেও login allowed
 * - payment submit allowed
 */
router.post(
  "/upgrade-center",
  protect,
  coachingScope,
  roleGuard(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  subscriptionController.upgradeCenter,
);

router.get(
  "/my-status",
  protect,
  coachingScope,
  roleGuard(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  subscriptionController.myStatus,
);

/**
 * ✅ Super Admin Routes
 */
router.get(
  "/monitor-all",
  protect,
  roleGuard(ROLES.SUPER_ADMIN),
  subscriptionController.monitorAll,
);

router.get(
  "/payments",
  protect,
  roleGuard(ROLES.SUPER_ADMIN),
  subscriptionController.listPayments,
);

router.put(
  "/payments/:paymentId/verify",
  protect,
  roleGuard(ROLES.SUPER_ADMIN),
  subscriptionController.verifyPayment,
);

module.exports = router;
