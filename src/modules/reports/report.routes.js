const express = require("express");
const router = express.Router();

const reportController = require("./report.controller");
const { protect } = require("../auth/auth.middleware");
const coachingScope = require("../../middlewares/coachingScope");
const subscriptionGuard = require("../../middlewares/subscriptionGuard");
const roleGuard = require("../../middlewares/roleGuard");

/**
 * Role constants (avoid typos)
 */
const ROLES = Object.freeze({
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  TEACHER: "teacher",
  STAFF: "staff",
});

/**
 * Global middlewares for all report routes:
 * 1) protect            -> JWT auth
 * 2) coachingScope      -> req.coaching_id tenant isolation
 * 3) subscriptionGuard  -> blocks if trial expired / subscription expired (402)
 * 4) roleGuard          -> only admin can export reports (and super-admin override)
 */
router.use(protect);
router.use(coachingScope);
router.use(subscriptionGuard);
router.use(roleGuard(ROLES.ADMIN, ROLES.SUPER_ADMIN));

/**
 * Reports
 * GET /api/v1/reports/students
 * GET /api/v1/reports/defaulters?month=January-2026
 */
router.get("/students", reportController.downloadStudentReport);
router.get("/defaulters", reportController.downloadDefaulterReport);

module.exports = router;
