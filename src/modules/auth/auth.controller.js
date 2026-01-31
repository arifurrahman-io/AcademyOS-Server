const authService = require('./auth.service');
const Coaching = require('../coachingCenter/coaching.model');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Provide email and password" });
    }

    const { user, token, isTrialExpired } = await authService.loginUser(email, password);

    // Fetch the actual coaching center data to get the saved settings
    const coaching = await Coaching.findById(user.coaching_id);

    res.status(200).json({
      success: true,
      token,
      trialExpired: isTrialExpired,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        coaching_id: user.coaching_id,
        // Pull settings from the coaching document, not the user object
        settings: coaching?.settings || { classes: [], batches: [] } 
      }
    });

  } catch (error) {
    const statusCode = error.message === 'Invalid credentials' ? 401 : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};