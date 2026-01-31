const userService = require("./user.service");
const User = require("./user.model");

/**
 * @desc    Initialize a new staff or admin user node
 * @route   POST /api/v1/users/staff
 * @access  Private (Admin/Super-Admin)
 */
exports.createStaff = async (req, res) => {
  try {
    // Logic: Super-Admins must provide a coaching_id, Coaching Admins use their own
    const coachingId =
      req.user.role === "super-admin"
        ? req.body.coaching_id
        : req.user.coaching_id;

    if (!coachingId && req.user.role !== "super-admin") {
      throw new Error("Coaching identity missing for staff initialization");
    }

    const user = await userService.createUser(req.body, coachingId);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get currently logged-in user profile
 * @route   GET /api/v1/users/me
 */
exports.getMe = async (req, res) => {
  // Data is attached via the 'protect' middleware
  res.status(200).json({ success: true, data: req.user });
};

/**
 * @desc    Fetch all staff members for a specific coaching center
 * @route   GET /api/v1/users/staff
 * @access  Private (Coaching Admin)
 */
exports.getCoachingStaff = async (req, res) => {
  try {
    // Scoped by the coaching_id of the logged-in admin
    const staff = await User.find({
      coaching_id: req.user.coaching_id,
      role: { $ne: "super-admin" },
    }).select("-password");

    res.status(200).json({ success: true, count: staff.length, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update a specific user node
 * @route   PUT /api/v1/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User node not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Purge a user node from the registry
 * @route   DELETE /api/v1/users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User node purged" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
