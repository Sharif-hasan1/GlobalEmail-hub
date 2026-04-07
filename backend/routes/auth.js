const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const logActivity = require('../middleware/logActivity');

// @route POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }
    if (password.length < 6) {
      return res.status(400).json({ msg: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        msg: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'mailstocksecret', { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route POST /api/auth/login
router.post('/login', rateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    // Check account lock (brute-force protection)
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({ msg: `Account locked. Try again in ${mins} minutes.` });
    }

    // Check suspension/ban
    if (user.status === 'suspended') return res.status(403).json({ msg: 'Account suspended. Contact support.' });
    if (user.status === 'banned') return res.status(403).json({ msg: 'Account has been banned.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment login attempts, lock after 5 failures
      const attempts = (user.loginAttempts || 0) + 1;
      const update = { loginAttempts: attempts };
      if (attempts >= 5) {
        update.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock 15 min
        update.loginAttempts = 0;
      }
      await User.findByIdAndUpdate(user._id, update);
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Reset attempts on success
    await User.findByIdAndUpdate(user._id, {
      loginAttempts: 0, lockUntil: null,
      lastLogin: new Date(),
      lastLoginIP: req.ip || ''
    });

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'mailstocksecret', { expiresIn: '7d' });

    await logActivity(req, `User logged in: ${user.username}`, 'auth');

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, status: user.status }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
