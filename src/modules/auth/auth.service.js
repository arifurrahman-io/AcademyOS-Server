const User = require('../users/user.model');
const Coaching = require('../coachingCenter/coaching.model');
const jwt = require('../../utils/jwt');
const { TRIAL_DAYS } = require('../../config/env');

exports.loginUser = async (email, password) => {
  // 1. Find user and include password for comparison
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new Error('Invalid credentials');

  // 2. Check password (assuming you have a matchPassword method on your User model)
  const isMatch = await user.matchPassword(password);
  if (!isMatch) throw new Error('Invalid credentials');

  // 3. Fetch Coaching Center details to check trial/subscription
  const coaching = await Coaching.findById(user.coaching_id);
  
  // 4. Trial Logic: Check if expired
  let isTrialExpired = false;
  if (coaching && coaching.subscriptionStatus === 'trial') {
    const diffTime = Math.abs(new Date() - coaching.trialStartDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > TRIAL_DAYS) isTrialExpired = true;
  }

  // 5. Generate JWT with coaching_id and role
  const token = jwt.generateToken({ 
    id: user._id, 
    coaching_id: user.coaching_id, 
    role: user.role 
  });

  return { user, token, isTrialExpired };
};