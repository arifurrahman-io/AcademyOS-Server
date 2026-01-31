const express = require('express');
const router = express.Router();
const studentController = require('./student.controller');
const { protect } = require('../auth/auth.middleware');
const coachingScope = require('../../middlewares/coachingScope');

/**
 * Global Middlewares
 * - protect: Ensures the user is logged in via JWT
 * - coachingScope: Attaches req.coaching_id based on the user's center
 */
router.use(protect);
router.use(coachingScope);

/**
 * Collection Routes
 * GET  /api/v1/students - Fetch all students for the center
 * POST /api/v1/students - Enroll a new student
 */
router.route('/')
  .get(studentController.getStudents)
  .post(studentController.createStudent);

/**
 * Single Resource Routes (Dynamic ID)
 * FIX: This section enables the functionality for Profile, Edit, and Delete
 * GET    /api/v1/students/:id - Fetch a specific student's data
 * PUT    /api/v1/students/:id - Update student details
 * DELETE /api/v1/students/:id - Remove student from registry
 */
router.route('/:id')
  .get(studentController.getStudentById) // Used for Profile View & Edit Pre-fill
  .put(studentController.updateStudent)   // Used for saving Edits
  .delete(studentController.deleteStudent); // Used for Deletion

module.exports = router;