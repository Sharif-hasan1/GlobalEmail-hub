const mongoose = require('mongoose');

const DeliveredEmailSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    email: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    recovery: { type: String, default: '', trim: true },
    appPassword: { type: String, default: '', trim: true },
    security: { type: String, default: '', trim: true }
  },
  { timestamps: true }
);

DeliveredEmailSchema.index({ order: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('DeliveredEmail', DeliveredEmailSchema);
