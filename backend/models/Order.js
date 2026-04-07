const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  title: String,
  quantity: Number,
  price: Number
});

const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [OrderItemSchema],
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'cancelled'],
      default: 'pending'
    },
    paymentMethod: { type: String, enum: ['usdt_trc20', 'binance_pay', ''], default: '' },
    paymentTxId: { type: String, default: '' },
    note: { type: String, default: '' },
    emailsDelivered: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
