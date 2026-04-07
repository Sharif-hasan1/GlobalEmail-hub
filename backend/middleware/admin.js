const User = require('../models/User');

// Role-based access: admin > manager > staff
const ROLE_LEVEL = { admin: 3, manager: 2, staff: 1, user: 0 };

/**
 * Factory: requireRole('staff') allows staff, manager, admin.
 * Default export (no arg) requires 'admin'.
 */
function requireRole(minRole = 'admin') {
  const minLevel = ROLE_LEVEL[minRole] ?? 3;

  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user || (ROLE_LEVEL[user.role] ?? 0) < minLevel) {
        return res.status(403).json({ msg: `Requires ${minRole} access or higher` });
      }
      if (user.status !== 'active') {
        return res.status(403).json({ msg: 'Account suspended' });
      }
      req.adminUser = user;
      next();
    } catch {
      res.status(500).json({ msg: 'Server error' });
    }
  };
}

// Default admin-only middleware (backwards-compatible)
module.exports = requireRole('staff');
module.exports.requireRole = requireRole;
