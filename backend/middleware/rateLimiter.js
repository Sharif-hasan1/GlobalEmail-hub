// In-memory rate limiter (no extra dependency needed)
const attempts = new Map();

const WINDOW_MS = 15 * 60 * 1000;  // 15 minutes
const MAX_ATTEMPTS = 8;

function rateLimiter(req, res, next) {
  const key = req.ip + ':' + (req.body?.email || '');
  const now = Date.now();
  const record = attempts.get(key);

  if (record) {
    // Clean expired
    if (now - record.firstAttempt > WINDOW_MS) {
      attempts.delete(key);
    } else if (record.count >= MAX_ATTEMPTS) {
      const retryAfter = Math.ceil((record.firstAttempt + WINDOW_MS - now) / 1000);
      return res.status(429).json({
        msg: `Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        retryAfter
      });
    }
  }

  // Track
  const existing = attempts.get(key);
  if (existing && now - existing.firstAttempt <= WINDOW_MS) {
    existing.count++;
  } else {
    attempts.set(key, { count: 1, firstAttempt: now });
  }

  next();
}

// Cleanup stale entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts) {
    if (now - record.firstAttempt > WINDOW_MS) attempts.delete(key);
  }
}, 30 * 60 * 1000);

module.exports = rateLimiter;
