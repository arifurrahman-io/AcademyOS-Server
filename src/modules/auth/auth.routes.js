const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");

// Existing Login Route
router.post("/login", authController.login);

/**
 * @desc    Register a new Coaching Center and its first Admin
 * @route   POST /api/v1/auth/register-center
 */
router.post("/register-center", authController.registerCenter);

/**
 * @desc    Temporary route to setup the first Super-Admin
 * @route   POST /api/v1/auth/setup-root
 */
router.post("/setup-root", authController.setupRoot);

module.exports = router;
