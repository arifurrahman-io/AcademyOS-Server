const Coaching = require("../modules/coachingCenter/coaching.model"); // path ঠিক করুন

module.exports = async function subscriptionGuard(req, res, next) {
  try {
    // super-admin always allowed
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
      .select("subscriptionStatus trialExpiryDate subscriptionEndDate")
      .lean();

    if (!center) {
      return res.status(404).json({
        success: false,
        message: "Coaching center not found",
        code: "CENTER_NOT_FOUND",
      });
    }

    const now = new Date();

    // ✅ Active subscription check
    if (
      center.subscriptionStatus === "active" &&
      center.subscriptionEndDate &&
      new Date(center.subscriptionEndDate) > now
    ) {
      return next();
    }

    // ✅ Trial check
    if (
      center.subscriptionStatus === "trial" &&
      center.trialExpiryDate &&
      new Date(center.trialExpiryDate) > now
    ) {
      return next();
    }

    // Otherwise locked (but login allowed)
    return res.status(402).json({
      success: false,
      message: "Instance Restricted: Subscription required",
      code: "SUBSCRIPTION_REQUIRED",
    });
  } catch (err) {
    console.error("SUBSCRIPTION_GUARD_ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Subscription guard failed",
    });
  }
};
