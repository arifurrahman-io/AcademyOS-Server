const mongoose = require("mongoose");

/**
 * coachingScope
 * ---------------------------------------------------------
 * Sets req.coaching_id for tenant-scoped controllers.
 * Expects protect() to attach req.user and a coaching id field.
 *
 * Supports these common user fields:
 * - req.user.coaching_id  (your schema uses this)
 * - req.user.coachingId
 * - req.user.center_id
 * - req.user.centerId
 */
module.exports = (req, res, next) => {
  try {
    // Debug (keep for now, remove later)
    console.log("✅ coachingScope hit:", req.method, req.originalUrl);
    console.log("USER:", {
      id: req.user?._id,
      role: req.user?.role,
      coaching_id: req.user?.coaching_id,
      coachingId: req.user?.coachingId,
    });

    const coachingId =
      req.user?.coaching_id ||
      req.user?.coachingId ||
      req.user?.center_id ||
      req.user?.centerId;

    if (!coachingId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: coaching scope missing for this user",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(coachingId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: invalid coaching scope",
      });
    }

    // normalize for controllers
    req.coaching_id = coachingId;

    return next();
  } catch (err) {
    console.error("COACHING_SCOPE_ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Coaching scope failed",
    });
  }
};
