const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    category: {
      type: String,
      enum: ['auth', 'product', 'order', 'user', 'settings', 'system'],
      default: 'system'
    },
    details: { type: String, default: '' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' }
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ user: 1, createdAt: -1 });
ActivityLogSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
