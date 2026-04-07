const ActivityLog = require('../models/ActivityLog');

async function logActivity(req, action, category = 'system', details = '') {
  try {
    await ActivityLog.create({
      user: req.user?.id || null,
      action,
      category,
      details,
      ip: req.ip || req.connection?.remoteAddress || '',
      userAgent: (req.headers?.['user-agent'] || '').substring(0, 300)
    });
  } catch {
    // Non-blocking; don't crash the request
  }
}

module.exports = logActivity;
