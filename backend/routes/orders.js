const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const DeliveredEmail = require('../models/DeliveredEmail');
const OrderFile = require('../models/OrderFile');

// @route POST /api/orders
router.post('/', auth, async (req, res) => {
  try {
    const { items, paymentMethod, paymentTxId } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ msg: 'No items in order' });
    }
    if (!paymentMethod || !['usdt_trc20', 'binance_pay'].includes(paymentMethod)) {
      return res.status(400).json({ msg: 'Please select a valid payment method' });
    }
    if (!paymentTxId || !paymentTxId.trim()) {
      return res.status(400).json({ msg: 'Please enter a transaction ID / payment reference' });
    }
    if (paymentMethod === 'usdt_trc20' && !/^[a-fA-F0-9]{10,}$/.test(paymentTxId.trim())) {
      return res.status(400).json({ msg: 'Invalid TRC20 transaction hash. Must be hex characters, at least 10 characters long.' });
    }
    if (paymentMethod === 'binance_pay' && paymentTxId.trim().length < 8) {
      return res.status(400).json({ msg: 'Invalid Binance Pay reference. Must be at least 8 characters.' });
    }

    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ msg: `Product not found` });
      if (!product.active) return res.status(400).json({ msg: `${product.title} is no longer available` });
      if (product.stock < item.quantity) {
        return res.status(400).json({ msg: `Insufficient stock for ${product.title}. Available: ${product.stock}` });
      }

      total += product.price * item.quantity;
      orderItems.push({
        product: product._id,
        title: product.title,
        quantity: item.quantity,
        price: product.price
      });

      product.stock -= item.quantity;
      await product.save();
    }

    const order = new Order({
      user: req.user.id,
      items: orderItems,
      total,
      paymentMethod: paymentMethod,
      paymentTxId: paymentTxId.trim()
    });
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route GET /api/orders/my
router.get('/my', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route GET /api/orders/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route GET /api/orders/:id/emails — user fetches delivered emails for their order
router.get('/:id/emails', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    const emails = await DeliveredEmail.find({ order: order._id }).select('email password recovery').sort({ createdAt: 1 });
    res.json(emails);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route GET /api/orders/:id/files — user lists files for their order
router.get('/:id/files', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    const files = await OrderFile.find({ order: order._id }).select('originalName fileSize createdAt downloads').sort({ createdAt: -1 });
    res.json(files);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route GET /api/orders/:id/files/:fileId/download — user downloads a file
router.get('/:id/files/:fileId/download', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ msg: 'Order not found' });

    const orderFile = await OrderFile.findOne({ _id: req.params.fileId, order: order._id });
    if (!orderFile) return res.status(404).json({ msg: 'File not found' });

    const filePath = path.join(__dirname, '..', 'uploads', 'orders', orderFile.storedName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'File no longer available on server' });

    // Update download stats
    orderFile.downloads += 1;
    orderFile.lastDownloadAt = new Date();
    await orderFile.save();

    res.setHeader('Content-Disposition', `attachment; filename="${orderFile.originalName}"`);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
