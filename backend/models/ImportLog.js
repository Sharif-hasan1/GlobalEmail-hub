const mongoose = require('mongoose');

const ImportLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    fileName: { type: String, required: true },
    totalRows: { type: Number, default: 0 },
    importedRows: { type: Number, default: 0 },
    errorRows: { type: Number, default: 0 },
    errors: [{ type: String }]
  },
  { timestamps: true }
);

ImportLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ImportLog', ImportLogSchema);
