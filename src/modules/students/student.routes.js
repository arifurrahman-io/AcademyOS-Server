const express = require("express");
const router = express.Router();

const studentController = require("./student.controller");
const { protect } = require("../auth/auth.middleware");
const coachingScope = require("../../middlewares/coachingScope");
const subscriptionGuard = require("../../middlewares/subscriptionGuard");
const roleGuard = require("../../middlewares/roleGuard");
const mongoose = require("mongoose");

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
 * Validate ObjectId param (prevents invalid :id causing cast errors)
 */
const validateObjectIdParam =
  (paramName = "id") =>
  (req, res, next) => {
    const value = req.params?.[paramName];
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}`,
        code: "INVALID_OBJECT_ID",
      });
    }
    return next();
  };

/**
 * Global Middlewares
 * - protect: JWT auth
 * - coachingScope: attaches req.coaching_id (tenant isolation)
 * - subscriptionGuard: blocks expired trial/subscription (402)
 */
router.use(protect);
router.use(coachingScope);
router.use(subscriptionGuard);

/**
 * Collection Routes
 * GET  /api/v1/students  -> list
 * POST /api/v1/students  -> create
 *
 * Access:
 * - admin: full
 * - teacher/staff: allow list/create (adjust if you want)
 */
router
  .route("/")
  .get(
    roleGuard(ROLES.ADMIN, ROLES.TEACHER, ROLES.STAFF, ROLES.SUPER_ADMIN),
    studentController.getStudents,
  )
  .post(
    roleGuard(ROLES.ADMIN, ROLES.TEACHER, ROLES.SUPER_ADMIN),
    studentController.createStudent,
  );

/**
 * Single Resource Routes
 * GET    /api/v1/students/:id
 * PUT    /api/v1/students/:id
 * DELETE /api/v1/students/:id
 */
router
  .route("/:id")
  .all(validateObjectIdParam("id"))
  .get(
    roleGuard(ROLES.ADMIN, ROLES.TEACHER, ROLES.STAFF, ROLES.SUPER_ADMIN),
    studentController.getStudentById,
  )
  .put(
    roleGuard(ROLES.ADMIN, ROLES.TEACHER, ROLES.SUPER_ADMIN),
    studentController.updateStudent,
  )
  .delete(
    roleGuard(ROLES.ADMIN, ROLES.SUPER_ADMIN),
    studentController.deleteStudent,
  );

module.exports = router;
