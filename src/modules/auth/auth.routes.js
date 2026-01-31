const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const User = require('../users/user.model'); 
const CoachingCenter = require('../coachingCenter/coaching.model'); // Import the Coaching model

// Existing Login Route
router.post('/login', authController.login);

/**
 * @desc    Register a new Coaching Center and its first Admin
 * @route   POST /api/v1/auth/register-center
 * @access  Public (or restricted to Super-Admin depending on your business model)
 */
router.post('/register-center', async (req, res, next) => {
  try {
    const { name, slug, email, password } = req.body;

    // 1. Check if the center slug or admin email already exists
    const slugExists = await CoachingCenter.findOne({ slug });
    if (slugExists) {
      return res.status(400).json({ success: false, message: "Center URL/Slug already taken" });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: "Admin email already registered" });
    }

    // 2. Create the Coaching Center first
    const center = await CoachingCenter.create({
      name,
      slug,
      trialStartDate: new Date(), // Starts the 7-day trial
      status: 'trial'
    });

    // 3. Create the Admin User linked to this center
    const admin = await User.create({
      name: `${name} Admin`,
      email,
      password,
      role: 'admin',
      coaching_id: center._id // Link the user to the new tenant
    });

    res.status(201).json({
      success: true,
      message: "Center and Admin registered successfully",
      data: {
        center,
        admin: {
          id: admin._id,
          email: admin.email,
          role: admin.role
        }
      }
    });
  } catch (error) {
    next(error); // Pass to global error handler
  }
});

// Temporary route to setup the first Super-Admin
router.post('/setup-root', async (req, res, next) => {
  try {
    const exists = await User.findOne({ role: 'super-admin' });
    if (exists) {
      return res.status(400).json({ success: false, message: "Super-admin already exists" });
    }
  
    const admin = await User.create({
      name: "System Admin",
      email: req.body.email,
      password: req.body.password,
      role: "super-admin",
      coaching_id: null 
    });

    res.status(201).json({ success: true, data: admin });
  } catch (error) {
    next(error); 
  }
});

module.exports = router;