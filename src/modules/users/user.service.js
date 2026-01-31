const User = require("./user.model");

/**
 * @desc    Initializes a new user node (Staff or Admin)
 * @param   {Object} userData - Core credentials and profile info
 * @param   {ObjectId} creatorCoachingId - The coaching_id of the person creating the user
 */
exports.createUser = async (userData, creatorCoachingId) => {
  // Security: If the creator is a Coaching Admin, force the new user into the same node
  if (creatorCoachingId) {
    userData.coaching_id = creatorCoachingId;
  }

  // Create user node; password hashing is handled by pre-save middleware in user.model.js
  const user = await User.create(userData);

  // Return user object without the password hash
  const userResponse = user.toObject();
  delete userResponse.password;

  return userResponse;
};

/**
 * @desc    Retrieves all staff members belonging to a specific coaching center
 * @param   {ObjectId} coachingId - The unique ID of the coaching node
 */
exports.getUsersByCoaching = async (coachingId) => {
  // Excludes passwords and sorts by newest first for the dashboard view
  return await User.find({ coaching_id: coachingId })
    .select("-password")
    .sort({ createdAt: -1 });
};

/**
 * @desc    Updates a specific user's profile or access role
 */
exports.updateUser = async (userId, updateData) => {
  // findByIdAndUpdate will trigger validation; model middleware handles password hashing if present
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true },
  ).select("-password");

  if (!user) throw new Error("User node not found");
  return user;
};

/**
 * @desc    Finds a user by email for authentication purposes
 */
exports.findUserByEmail = async (email) => {
  // Explicitly select password for the authService comparison during login
  return await User.findOne({ email }).select("+password");
};

/**
 * @desc    Purge a user record from the registry
 */
exports.deleteUser = async (userId) => {
  const user = await User.findByIdAndDelete(userId);
  if (!user) throw new Error("User not found");
  return user;
};
