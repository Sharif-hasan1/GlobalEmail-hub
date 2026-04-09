const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const auth = require('../middleware/auth');
const adminCheck = require('../middleware/admin');
const { requireRole } = require('../middleware/admin');
const logActivity = require('../middleware/logActivity');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const Coupon = require('../models/Coupon');
const Settings = require('../models/Settings');
const DeliveredEmail = require('../models/DeliveredEmail');
const OrderFile = require('../models/OrderFile');
const ImportLog = require('../models/ImportLog');

// ─── File uploads setup ────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const orderFilesDir = path.join(uploadsDir, 'orders');
if (!fs.existsSync(orderFilesDir)) fs.mkdirSync(orderFilesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const safeName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, safeName);
  }
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

const bulkUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /csv|txt/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only CSV/TXT files are allowed'));
  }
});

const excelUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /xlsx|xls|csv/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only Excel/CSV files (.xlsx, .xls, .csv) are allowed'));
  }
});

const orderFileStorage = multer.diskStorage({
  destination: orderFilesDir,
  filename: (req, file, cb) => {
    const orderId = req.params.id ? req.params.id.slice(-6).toUpperCase() : 'UNKNOWN';
    const safeName = `order_${orderId}_${Date.now()}${path.extname(file.originalname).toLowerCase()}`;
    cb(null, safeName);
  }
});

const orderFileUpload = multer({
  storage: orderFileStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /xlsx|xls|csv|txt/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only .xlsx, .xls, .csv, .txt files are allowed'));
  }
});

// ─── Column header mapping helpers ─────────────────────
const EMAIL_ALIASES = ['email', 'e-mail', 'user name', 'username', 'login', 'mail', 'user email', 'account', 'account email'];
const PASSWORD_ALIASES = ['password', 'pass', 'pwd', 'passwd'];
const APP_PASSWORD_ALIASES = ['app password', 'app pass', 'apppassword', 'app pwd'];
const RECOVERY_ALIASES = ['recovery', 'recovery mail', 'recovery email', 'backup', 'backup email', 'recovery address'];
const SECURITY_ALIASES = ['security key', 'security', '2fa', '2fa key', 'backup code', 'backup codes'];

function findColumn(headers, aliases) {
  for (const h of headers) {
    const lower = h.toLowerCase().trim();
    if (aliases.includes(lower)) return h;
  }
  return null;
}

function mapRow(row, headers) {
  const emailCol = findColumn(headers, EMAIL_ALIASES);
  const passCol = findColumn(headers, PASSWORD_ALIASES);
  const recoveryCol = findColumn(headers, RECOVERY_ALIASES);
  const securityCol = findColumn(headers, SECURITY_ALIASES);
  const appPassCol = findColumn(headers, APP_PASSWORD_ALIASES);

  return {
    email: emailCol ? (row[emailCol] || '').toString().trim() : '',
    password: passCol ? (row[passCol] || '').toString().trim() : '',
    recovery: recoveryCol ? (row[recoveryCol] || '').toString().trim() : '',
    security: securityCol ? (row[securityCol] || '').toString().trim() : '',
    appPassword: appPassCol ? (row[appPassCol] || '').toString().trim() : '',
    _cols: { emailCol, passCol, recoveryCol, securityCol, appPassCol }
  };
}

function parseExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath, { type: 'file', codepage: 65001 });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { rows, headers };
}

// ═══════════════════════════════════════════════════════
//  DASHBOARD / STATS
// ═══════════════════════════════════════════════════════

router.get('/stats', auth, adminCheck, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalProducts, activeProducts, totalOrders, pendingOrders,
      totalUsers, revenueData, todaySalesData, recentOrders,
      lowStock, recentLogs
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ active: true }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      User.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: todayStart }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Order.find().populate('user', 'username email').sort({ createdAt: -1 }).limit(8),
      Product.find({ stock: { $lt: 10 }, active: true }).sort({ stock: 1 }).limit(8),
      ActivityLog.find().populate('user', 'username').sort({ createdAt: -1 }).limit(10)
    ]);

    // Monthly revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, status: { $ne: 'cancelled' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Top-selling products
    const topProducts = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.title', totalSold: { $sum: '$items.quantity' }, totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      totalProducts, activeProducts, totalOrders, pendingOrders, totalUsers,
      totalRevenue: revenueData[0]?.total || 0,
      totalCompletedOrders: revenueData[0]?.count || 0,
      todaySales: todaySalesData[0]?.total || 0,
      todayOrders: todaySalesData[0]?.count || 0,
      recentOrders, lowStock, recentLogs,
      monthlyRevenue, topProducts
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════════════════

router.get('/products', auth, adminCheck, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.post('/products', auth, adminCheck, imageUpload.single('iconFile'), async (req, res) => {
  try {
    const { title, description, category, provider, stock, price, active, featured } = req.body;
    const product = new Product({
      title, description,
      category: category || 'Gmail',
      provider: provider || 'Gmail',
      icon: req.file ? `/uploads/${req.file.filename}` : (req.body.icon || 'gmail'),
      stock: Number(stock) || 0,
      price: Number(price) || 0,
      active: active !== 'false',
      featured: featured === 'true'
    });
    await product.save();
    await logActivity(req, `Created product: ${title}`, 'product', product._id.toString());
    res.status(201).json(product);
  } catch (err) { console.error(err); res.status(500).json({ msg: 'Server error' }); }
});

router.put('/products/:id', auth, adminCheck, imageUpload.single('iconFile'), async (req, res) => {
  try {
    const { title, description, category, provider, stock, price, active, featured } = req.body;
    const update = {
      title, description, category, provider,
      stock: Number(stock), price: Number(price),
      active: active !== 'false', featured: featured === 'true'
    };
    if (req.file) update.icon = `/uploads/${req.file.filename}`;
    else if (req.body.icon) update.icon = req.body.icon;

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    await logActivity(req, `Updated product: ${title}`, 'product', req.params.id);
    res.json(product);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.delete('/products/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    await logActivity(req, `Deleted product: ${product.title}`, 'product', req.params.id);
    res.json({ msg: 'Product deleted' });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Bulk import products (CSV/TXT)
router.post('/products/bulk-import', auth, requireRole('admin'), bulkUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

    const content = fs.readFileSync(req.file.path, 'utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim());

    if (lines.length < 2) return res.status(400).json({ msg: 'File must have a header row and at least one data row' });

    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const requiredCols = ['title', 'price'];
    for (const col of requiredCols) {
      if (!header.includes(col)) return res.status(400).json({ msg: `CSV missing required column: ${col}` });
    }

    const products = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim());
      if (vals.length < header.length) { errors.push(`Row ${i + 1}: insufficient columns`); continue; }

      const row = {};
      header.forEach((h, idx) => { row[h] = vals[idx]; });

      if (!row.title || !row.price || isNaN(Number(row.price))) {
        errors.push(`Row ${i + 1}: invalid data`);
        continue;
      }

      products.push({
        title: row.title,
        description: row.description || row.title,
        category: row.category || 'Gmail',
        provider: row.provider || row.category || 'Gmail',
        icon: (row.icon || row.category || 'gmail').toLowerCase(),
        stock: Number(row.stock) || 0,
        price: Number(row.price),
        active: row.active !== 'false',
        featured: row.featured === 'true'
      });
    }

    let inserted = 0;
    if (products.length > 0) {
      const result = await Product.insertMany(products);
      inserted = result.length;
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    await logActivity(req, `Bulk imported ${inserted} products`, 'product');
    res.json({ imported: inserted, errors, total: lines.length - 1 });
  } catch (err) { console.error(err); res.status(500).json({ msg: 'Bulk import failed' }); }
});

// ═══════════════════════════════════════════════════════
//  ORDERS
// ═══════════════════════════════════════════════════════

router.get('/orders', auth, adminCheck, async (req, res) => {
  try {
    const { status, search, from, to } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to + 'T23:59:59');
    }

    let orders = await Order.find(filter).populate('user', 'username email').sort({ createdAt: -1 });

    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(o =>
        o._id.toString().toLowerCase().includes(q) ||
        (o.user?.username || '').toLowerCase().includes(q) ||
        (o.user?.email || '').toLowerCase().includes(q)
      );
    }

    res.json(orders);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.put('/orders/:id', auth, adminCheck, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('user', 'username email');
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    await logActivity(req, `Updated order #${order._id.toString().slice(-8)} to ${status}`, 'order', order._id.toString());
    res.json(order);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Download sample email template
router.get('/orders/email-template', auth, requireRole('admin'), (req, res) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Username', 'Password', 'Recovery Mail', 'App Password', 'Security Key'],
    ['user1@gmail.com', 'pass123', 'recovery@gmail.com', 'app123', 'key123'],
    ['user2@gmail.com', 'pass456', '', '', '']
  ]);
  ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Emails');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=email_import_template.xlsx');
  res.send(buf);
});

// Preview Excel file for per-order email import (no DB changes)
router.post('/orders/:id/preview-emails', auth, requireRole('admin'), excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

    const order = await Order.findById(req.params.id);
    if (!order) { fs.unlinkSync(req.file.path); return res.status(404).json({ msg: 'Order not found' }); }

    const { rows, headers } = parseExcelFile(req.file.path);
    fs.unlinkSync(req.file.path);

    if (rows.length === 0) return res.status(400).json({ msg: 'Excel file is empty — no data rows found' });

    // Detect columns
    const emailCol = findColumn(headers, EMAIL_ALIASES);
    const passCol = findColumn(headers, PASSWORD_ALIASES);

    if (!emailCol) {
      return res.status(400).json({
        msg: `Could not find an email column. Detected headers: [${headers.join(', ')}]. Accepted email column names: ${EMAIL_ALIASES.join(', ')}`
      });
    }
    if (!passCol) {
      return res.status(400).json({
        msg: `Could not find a password column. Detected headers: [${headers.join(', ')}]. Accepted password column names: ${PASSWORD_ALIASES.join(', ')}`
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const preview = [];
    const errors = [];
    const seenEmails = new Set();

    // Check existing emails for this order
    const existing = await DeliveredEmail.find({ order: order._id }).select('email');
    const existingSet = new Set(existing.map(e => e.email.toLowerCase()));

    for (let i = 0; i < rows.length; i++) {
      const mapped = mapRow(rows[i], headers);
      const rowNum = i + 2;

      // Skip completely empty rows
      if (!mapped.email && !mapped.password) continue;

      if (!mapped.email) { errors.push(`Row ${rowNum}: Email not found in column "${emailCol}". Please check the data.`); continue; }
      if (!emailRegex.test(mapped.email)) { errors.push(`Row ${rowNum}: invalid email format "${mapped.email}"`); continue; }
      if (!mapped.password) { errors.push(`Row ${rowNum}: missing password for "${mapped.email}"`); continue; }
      if (seenEmails.has(mapped.email.toLowerCase())) { errors.push(`Row ${rowNum}: duplicate email "${mapped.email}"`); continue; }
      if (existingSet.has(mapped.email.toLowerCase())) { errors.push(`Row ${rowNum}: email "${mapped.email}" already delivered for this order`); continue; }

      seenEmails.add(mapped.email.toLowerCase());
      preview.push({ email: mapped.email, password: mapped.password, recovery: mapped.recovery, appPassword: mapped.appPassword, security: mapped.security, row: rowNum });
    }

    // Calculate total needed emails from order items quantity
    const totalNeeded = order.items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      preview, errors, totalNeeded,
      alreadyDelivered: existing.length,
      orderId: order._id,
      detectedColumns: { email: emailCol, password: passCol, recovery: findColumn(headers, RECOVERY_ALIASES), appPassword: findColumn(headers, APP_PASSWORD_ALIASES), security: findColumn(headers, SECURITY_ALIASES) }
    });
  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ msg: 'Preview failed' });
  }
});

// Import emails for a specific order
router.post('/orders/:id/import-emails', auth, requireRole('admin'), excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

    const order = await Order.findById(req.params.id).populate('user', 'username email');
    if (!order) { fs.unlinkSync(req.file.path); return res.status(404).json({ msg: 'Order not found' }); }

    const { rows, headers } = parseExcelFile(req.file.path);
    fs.unlinkSync(req.file.path);

    if (rows.length === 0) return res.status(400).json({ msg: 'Excel file is empty — no data rows found' });

    const emailCol = findColumn(headers, EMAIL_ALIASES);
    const passCol = findColumn(headers, PASSWORD_ALIASES);

    if (!emailCol) return res.status(400).json({ msg: `Could not find an email column. Detected headers: [${headers.join(', ')}]` });
    if (!passCol) return res.status(400).json({ msg: `Could not find a password column. Detected headers: [${headers.join(', ')}]` });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errors = [];
    const toInsert = [];
    const seenEmails = new Set();

    // Check existing emails for this order
    const existing = await DeliveredEmail.find({ order: order._id }).select('email');
    const existingSet = new Set(existing.map(e => e.email.toLowerCase()));

    for (let i = 0; i < rows.length; i++) {
      const mapped = mapRow(rows[i], headers);
      const rowNum = i + 2;

      // Skip completely empty rows
      if (!mapped.email && !mapped.password) continue;

      if (!mapped.email) { errors.push(`Row ${rowNum}: Email not found in column "${emailCol}". Please check the data.`); continue; }
      if (!emailRegex.test(mapped.email)) { errors.push(`Row ${rowNum}: invalid email format "${mapped.email}"`); continue; }
      if (!mapped.password) { errors.push(`Row ${rowNum}: missing password for "${mapped.email}"`); continue; }
      if (seenEmails.has(mapped.email.toLowerCase())) { errors.push(`Row ${rowNum}: duplicate email "${mapped.email}"`); continue; }
      if (existingSet.has(mapped.email.toLowerCase())) { errors.push(`Row ${rowNum}: email "${mapped.email}" already delivered`); continue; }

      seenEmails.add(mapped.email.toLowerCase());
      toInsert.push({ order: order._id, email: mapped.email, password: mapped.password, recovery: mapped.recovery, appPassword: mapped.appPassword, security: mapped.security });
    }

    if (toInsert.length === 0) {
      return res.status(400).json({ msg: 'No valid emails to import', errors });
    }

    // Insert emails in chunks of 500 for performance
    const CHUNK_SIZE = 500;
    for (let c = 0; c < toInsert.length; c += CHUNK_SIZE) {
      await DeliveredEmail.insertMany(toInsert.slice(c, c + CHUNK_SIZE));
    }

    // Update order: mark as completed, set emailsDelivered count
    const totalDelivered = existing.length + toInsert.length;
    order.emailsDelivered = totalDelivered;
    order.status = 'completed';
    await order.save();

    // Log the import
    await ImportLog.create({
      admin: req.user.id,
      order: order._id,
      fileName: req.file ? req.file.originalname : 'unknown',
      totalRows: rows.length,
      importedRows: toInsert.length,
      errorRows: errors.length,
      errors: errors.slice(0, 50)
    });

    await logActivity(req, `Imported ${toInsert.length} emails for order #${order._id.toString().slice(-8)} — marked completed`, 'order', order._id.toString());

    res.json({
      imported: toInsert.length,
      totalDelivered,
      errors,
      orderId: order._id,
      status: 'completed'
    });
  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ msg: 'Email import failed' });
  }
});

// Get delivered emails for an order (admin)
router.get('/orders/:id/emails', auth, adminCheck, async (req, res) => {
  try {
    const emails = await DeliveredEmail.find({ order: req.params.id }).sort({ createdAt: 1 });
    res.json(emails);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Update a delivered email (edit fields like appPassword, security, etc.)
router.put('/emails/:emailId', auth, requireRole('admin'), async (req, res) => {
  try {
    const { email, password, recovery, appPassword, security } = req.body;
    const update = {};
    if (email !== undefined) update.email = email;
    if (password !== undefined) update.password = password;
    if (recovery !== undefined) update.recovery = recovery;
    if (appPassword !== undefined) update.appPassword = appPassword;
    if (security !== undefined) update.security = security;

    const doc = await DeliveredEmail.findByIdAndUpdate(req.params.emailId, update, { new: true });
    if (!doc) return res.status(404).json({ msg: 'Email not found' });
    res.json(doc);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════
//  ORDER FILE DELIVERY SYSTEM
// ═══════════════════════════════════════════════════════

// Upload file for an order (admin)
router.post('/orders/:id/upload-file', auth, requireRole('admin'), orderFileUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

    const order = await Order.findById(req.params.id).populate('user', 'username email');
    if (!order) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ msg: 'Order not found' });
    }

    const orderFile = await OrderFile.create({
      order: order._id,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user.id
    });

    // Mark order as completed
    order.status = 'completed';
    await order.save();

    await logActivity(req, `Uploaded file "${req.file.originalname}" for order #${order._id.toString().slice(-8)} — marked completed`, 'order', order._id.toString());

    res.json({
      file: orderFile,
      orderId: order._id,
      status: 'completed',
      msg: 'File uploaded and order marked as completed'
    });
  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ msg: 'File upload failed' });
  }
});

// List files for an order (admin)
router.get('/orders/:id/files', auth, adminCheck, async (req, res) => {
  try {
    const files = await OrderFile.find({ order: req.params.id }).sort({ createdAt: -1 });
    res.json(files);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Delete a file (admin)
router.delete('/orders/files/:fileId', auth, requireRole('admin'), async (req, res) => {
  try {
    const orderFile = await OrderFile.findById(req.params.fileId);
    if (!orderFile) return res.status(404).json({ msg: 'File not found' });

    const filePath = path.join(orderFilesDir, orderFile.storedName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await OrderFile.findByIdAndDelete(req.params.fileId);
    await logActivity(req, `Deleted file "${orderFile.originalName}" from order #${orderFile.order.toString().slice(-8)}`, 'order', orderFile.order.toString());

    res.json({ msg: 'File deleted' });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Import orders from Excel
router.post('/orders/import-excel', auth, requireRole('admin'), excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ msg: 'Excel file is empty' });
    }

    const errors = [];
    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const email = (row.email || row.Email || '').toString().trim().toLowerCase();
      const productTitle = (row.product || row.Product || row.title || row.Title || '').toString().trim();
      const quantity = Number(row.quantity || row.Quantity || 1);
      const paymentMethod = (row.paymentMethod || row.payment || row.Payment || '').toString().trim();
      const paymentTxId = (row.paymentTxId || row.txId || row.TxId || '').toString().trim();
      const status = (row.status || row.Status || 'pending').toString().trim().toLowerCase();

      if (!email) { errors.push(`Row ${rowNum}: missing email`); continue; }
      if (!productTitle) { errors.push(`Row ${rowNum}: missing product`); continue; }

      const user = await User.findOne({ email });
      if (!user) { errors.push(`Row ${rowNum}: user "${email}" not found`); continue; }

      const escapedTitle = productTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const product = await Product.findOne({ title: { $regex: new RegExp('^' + escapedTitle + '$', 'i') } });
      if (!product) { errors.push(`Row ${rowNum}: product "${productTitle}" not found`); continue; }

      if (product.stock < quantity) { errors.push(`Row ${rowNum}: insufficient stock for "${productTitle}" (available: ${product.stock})`); continue; }

      const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
      const validPayments = ['usdt_trc20', 'binance_pay', ''];

      const order = new Order({
        user: user._id,
        items: [{ product: product._id, title: product.title, quantity, price: product.price }],
        total: product.price * quantity,
        status: validStatuses.includes(status) ? status : 'pending',
        paymentMethod: validPayments.includes(paymentMethod) ? paymentMethod : '',
        paymentTxId: paymentTxId || ''
      });

      await order.save();
      product.stock -= quantity;
      await product.save();
      imported++;
    }

    fs.unlinkSync(req.file.path);
    await logActivity(req, `Imported ${imported} orders from Excel`, 'order');
    res.json({ imported, errors, total: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Excel import failed' });
  }
});

// Export orders as CSV
router.get('/orders/export', auth, requireRole('manager'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    const orders = await Order.find(filter).populate('user', 'username email').sort({ createdAt: -1 });

    const csvHeader = 'Order ID,Customer,Email,Items,Total,Status,Date\n';
    const csvRows = orders.map(o =>
      `${o._id},${o.user?.username || 'N/A'},${o.user?.email || 'N/A'},${o.items.length},${o.total.toFixed(2)},${o.status},${new Date(o.createdAt).toISOString()}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders-export.csv');
    res.send(csvHeader + csvRows);
  } catch (err) { res.status(500).json({ msg: 'Export failed' }); }
});

// ═══════════════════════════════════════════════════════
//  USERS
// ═══════════════════════════════════════════════════════

router.get('/users', auth, adminCheck, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Get single user with order history
router.get('/users/:id', auth, adminCheck, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const orders = await Order.find({ user: req.params.id }).sort({ createdAt: -1 });
    res.json({ user, orders });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Update user (role, status, etc.)
router.put('/users/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { role, status, username, email } = req.body;
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ msg: 'User not found' });

    if (target.role === 'admin' && req.params.id !== req.user.id) {
      return res.status(403).json({ msg: 'Cannot modify another admin' });
    }

    const update = {};
    if (role) update.role = role;
    if (status) update.status = status;
    if (username) update.username = username;
    if (email) update.email = email;

    const updated = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    await logActivity(req, `Updated user: ${updated.username} (${Object.keys(update).join(', ')})`, 'user', req.params.id);
    res.json(updated);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Reset user password
router.put('/users/:id/reset-password', auth, requireRole('admin'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ msg: 'Password must be at least 6 characters' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    await User.findByIdAndUpdate(req.params.id, { password: hashed });
    await logActivity(req, `Reset password for user ${req.params.id}`, 'user', req.params.id);
    res.json({ msg: 'Password reset successful' });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Delete user
router.delete('/users/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ msg: 'Cannot delete your own account' });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ msg: 'User not found' });
    if (target.role === 'admin') return res.status(400).json({ msg: 'Cannot delete admin accounts' });
    await User.findByIdAndDelete(req.params.id);
    await logActivity(req, `Deleted user: ${target.username}`, 'user', req.params.id);
    res.json({ msg: 'User deleted' });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════
//  COUPONS
// ═══════════════════════════════════════════════════════

router.get('/coupons', auth, adminCheck, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.post('/coupons', auth, requireRole('manager'), async (req, res) => {
  try {
    const { code, type, value, minOrder, maxUses, expiresAt } = req.body;
    if (!code || !value) return res.status(400).json({ msg: 'Code and value are required' });
    const coupon = new Coupon({
      code: code.toUpperCase().trim(),
      type: type || 'percent',
      value: Number(value),
      minOrder: Number(minOrder) || 0,
      maxUses: Number(maxUses) || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });
    await coupon.save();
    await logActivity(req, `Created coupon: ${coupon.code}`, 'product');
    res.status(201).json(coupon);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ msg: 'Coupon code already exists' });
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/coupons/:id', auth, requireRole('manager'), async (req, res) => {
  try {
    const { code, type, value, minOrder, maxUses, active, expiresAt } = req.body;
    const update = {};
    if (code) update.code = code.toUpperCase().trim();
    if (type) update.type = type;
    if (value !== undefined) update.value = Number(value);
    if (minOrder !== undefined) update.minOrder = Number(minOrder);
    if (maxUses !== undefined) update.maxUses = Number(maxUses);
    if (active !== undefined) update.active = active;
    if (expiresAt !== undefined) update.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!coupon) return res.status(404).json({ msg: 'Coupon not found' });
    res.json(coupon);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.delete('/coupons/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Coupon deleted' });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════
//  ACTIVITY LOGS
// ═══════════════════════════════════════════════════════

router.get('/logs', auth, requireRole('admin'), async (req, res) => {
  try {
    const { category, limit } = req.query;
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    const logs = await ActivityLog.find(filter)
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 50);
    res.json(logs);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════

router.get('/settings', auth, requireRole('admin'), async (req, res) => {
  try {
    const docs = await Settings.find();
    const settings = {};
    docs.forEach(d => { settings[d.key] = d.value; });
    res.json(settings);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.put('/settings', auth, requireRole('admin'), async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await Settings.set(key, value);
    }
    await logActivity(req, `Updated settings: ${Object.keys(updates).join(', ')}`, 'settings');
    res.json({ msg: 'Settings updated' });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════
//  REPORTS
// ═══════════════════════════════════════════════════════

router.get('/reports/sales', auth, requireRole('manager'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { status: { $ne: 'cancelled' } };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to + 'T23:59:59');
    }

    const daily = await Order.aggregate([
      { $match: filter },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const byProduct = await Order.aggregate([
      { $match: filter },
      { $unwind: '$items' },
      { $group: { _id: '$items.title', sold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { revenue: -1 } }
    ]);

    const byStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }
    ]);

    res.json({ daily, byProduct, byStatus });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Export sales as CSV
router.get('/reports/export-csv', auth, requireRole('manager'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { status: { $ne: 'cancelled' } };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to + 'T23:59:59');
    }

    const orders = await Order.find(filter).populate('user', 'username email').sort({ createdAt: -1 });
    const csvHeader = 'Date,Order ID,Customer,Email,Items,Total,Status\n';
    const csvRows = orders.map(o =>
      `${new Date(o.createdAt).toISOString().split('T')[0]},${o._id},${(o.user?.username || 'N/A').replace(',', '')},${o.user?.email || 'N/A'},${o.items.length},${o.total.toFixed(2)},${o.status}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
    res.send(csvHeader + csvRows);
  } catch (err) { res.status(500).json({ msg: 'Export failed' }); }
});

// ═══════════════════════════════════════════════════════
//  IMPORT LOGS
// ═══════════════════════════════════════════════════════

router.get('/import-logs', auth, adminCheck, async (req, res) => {
  try {
    const { limit } = req.query;
    const logs = await ImportLog.find()
      .populate('admin', 'username email')
      .populate('order', '_id')
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 100);
    res.json(logs);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

module.exports = router;
