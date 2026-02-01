/**
 * Role Guard Middleware (array-safe)
 * ---------------------------------
 * Supports:
 *   roleGuard("admin")
 *   roleGuard("admin", "super-admin")
 *   roleGuard(["admin", "super-admin"])   ✅ (now works)
 */

const roleGuard = (...roles) => {
  // ✅ Flatten roles to support accidental array passing
  const flat = roles.flat(Infinity);

  // Normalize allowed roles once (case-insensitive)
  const allowed = flat
    .filter(Boolean)
    .map((r) => String(r).trim().toLowerCase());

  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: user not authenticated",
        });
      }

      const role = String(req.user?.role || "")
        .trim()
        .toLowerCase();

      if (!role) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: missing user role",
        });
      }

      // Debug (keep temporarily)
      console.log("✅ roleGuard hit:", req.method, req.originalUrl, {
        role,
        allowed,
      });

      if (allowed.length > 0 && !allowed.includes(role)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: role '${role}' is not permitted`,
        });
      }

      return next();
    } catch (err) {
      console.error("ROLE_GUARD_ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Role authorization failed",
      });
    }
  };
};

module.exports = roleGuard;
