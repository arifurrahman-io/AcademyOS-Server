const coachingScope = (req, res, next) => {
  // 1. Super-Admins have global access, so we don't force a scope unless they provide one
  if (req.user.role === 'super-admin') {
    if (req.query.coaching_id) {
      req.coaching_id = req.query.coaching_id;
    }
    return next();
  }

  // 2. For everyone else, their access is strictly tied to their own center
  if (!req.user.coaching_id) {
    return res.status(403).json({ message: 'User is not associated with any coaching center' });
  }

  req.coaching_id = req.user.coaching_id;
  next();
};

module.exports = coachingScope;