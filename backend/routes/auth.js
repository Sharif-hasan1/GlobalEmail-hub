const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
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

// @route POST /api/auth/github — GitHub OAuth login
router.post('/github', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ msg: 'GitHub code required' });

    // Exchange code for access token
    const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    }, { headers: { Accept: 'application/json' } });

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) return res.status(400).json({ msg: 'GitHub token exchange failed' });

    // Fetch GitHub user info
    const ghUser = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Fetch primary email (may be private)
    const ghEmails = await axios.get('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const primaryEmail = ghEmails.data.find(e => e.primary && e.verified)?.email || ghEmails.data.find(e => e.verified)?.email;
    if (!primaryEmail) return res.status(400).json({ msg: 'No verified email found on GitHub account' });

    const githubId = String(ghUser.data.id);
    const picture = ghUser.data.avatar_url || '';
    const name = ghUser.data.name || ghUser.data.login;

    // Check if user exists by githubId or email
    let user = await User.findOne({ $or: [{ githubId }, { email: primaryEmail }] });

    if (user) {
      if (!user.githubId) {
        user.githubId = githubId;
        if (picture) user.picture = picture;
        await user.save();
      }

      if (user.status === 'suspended') return res.status(403).json({ msg: 'Account suspended. Contact support.' });
      if (user.status === 'banned') return res.status(403).json({ msg: 'Account has been banned.' });

      user.lastLogin = new Date();
      user.lastLoginIP = req.ip || '';
      await user.save();
    } else {
      const username = (ghUser.data.login || primaryEmail.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '') + Math.floor(Math.random() * 1000);
      user = new User({
        username,
        email: primaryEmail,
        githubId,
        picture,
        lastLogin: new Date(),
        lastLoginIP: req.ip || ''
      });
      await user.save();
    }

    const tokenPayload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'mailstocksecret', { expiresIn: '7d' });

    await logActivity(req, `GitHub login: ${user.username}`, 'auth');

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        picture: user.picture
      }
    });
  } catch (err) {
    console.error('GitHub auth error:', err);
    res.status(500).json({ msg: 'GitHub authentication failed' });
  }
});

// @route POST /api/auth/google — Google OAuth login
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ msg: 'Google credential required' });

    // Verify token with Google
    const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = googleRes.data;

    if (!payload || !payload.email) {
      return res.status(400).json({ msg: 'Invalid Google token' });
    }

    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({ msg: 'Token audience mismatch' });
    }

    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        if (picture) user.picture = picture;
        await user.save();
      }
      if (user.status === 'suspended') return res.status(403).json({ msg: 'Account suspended. Contact support.' });
      if (user.status === 'banned') return res.status(403).json({ msg: 'Account has been banned.' });

      user.lastLogin = new Date();
      user.lastLoginIP = req.ip || '';
      await user.save();
    } else {
      const username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') + Math.floor(Math.random() * 1000);
      user = new User({
        username,
        email,
        googleId,
        picture: picture || '',
        lastLogin: new Date(),
        lastLoginIP: req.ip || ''
      });
      await user.save();
    }

    const tokenPayload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'mailstocksecret', { expiresIn: '7d' });

    await logActivity(req, `Google login: ${user.username}`, 'auth');

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        picture: user.picture
      }
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ msg: 'Google authentication failed' });
  }
});

module.exports = router;
