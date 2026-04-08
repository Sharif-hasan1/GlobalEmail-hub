const mongoose = require('mongoose');

const OrderFileSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    downloads: { type: Number, default: 0 },
    lastDownloadAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('OrderFile', OrderFileSchema);
