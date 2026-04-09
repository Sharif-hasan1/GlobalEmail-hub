const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin', 'manager', 'staff'], default: 'user' },
    balance: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLogin: { type: Date, default: null },
    lastLoginIP: { type: String, default: '' },
    githubId: { type: String, default: null },
    googleId: { type: String, default: null },
    picture: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
