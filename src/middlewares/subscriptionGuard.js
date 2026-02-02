const Coaching = require("../modules/coachingCenter/coaching.model");

/**
 * Subscription Guard
 * Blocks only EXPIRED states.
 *
 * Allowed:
 *  - active
 *  - trial_active
 *  - payment_pending
 *
 * Blocked:
 *  - trial_expired
 *  - expired
 */
module.exports = async function subscriptionGuard(req, res, next) {
  try {
    // ✅ super-admin always allowed
    const role = String(req.user?.role || "").toLowerCase();
    if (role === "super-admin") return next();

    const coachingId = req.coaching_id || req.user?.coaching_id;
    if (!coachingId) {
      return res.status(400).json({
        success: false,
        message: "Missing coaching scope",
        code: "COACHING_SCOPE_REQUIRED",
      });
    }

    const center = await Coaching.findById(coachingId)
      .select("subscription subscriptionStatus trialExpiryDate createdAt")
      .lean();

    if (!center) {
      return res.status(404).json({
        success: false,
        message: "Coaching center not found",
        code: "CENTER_NOT_FOUND",
      });
    }

    const now = new Date();
    const sub = center.subscription || {};

    /**
     * Normalize effective status
     */
    let status = String(sub.status || "trial_active").toLowerCase();

    // yearly expiry check
    if (status === "active" && sub.endAt && new Date(sub.endAt) <= now) {
      status = "expired";
    }

    /**
     * Trial expiry fallback (legacy compatibility)
     */
    if (
      status === "trial_active" &&
      center.trialExpiryDate &&
      new Date(center.trialExpiryDate) <= now
    ) {
      status = "trial_expired";
    }

    /**
     * ✅ ALLOWED STATES
     */
    if (
      status === "active" ||
      status === "trial_active" ||
      status === "payment_pending"
    ) {
      return next();
    }

    /**
     * ❌ BLOCKED STATES
     */
    return res.status(402).json({
      success: false,
      message: "Instance Restricted: Subscription required",
      code: "SUBSCRIPTION_REQUIRED",
      status, // helpful for frontend debugging
    });
  } catch (err) {
    console.error("SUBSCRIPTION_GUARD_ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Subscription guard failed",
    });
  }
};
