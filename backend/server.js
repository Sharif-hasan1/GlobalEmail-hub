require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

const app = express();

connectDB();

// Trust proxy so req.ip works behind reverse proxy
app.set('trust proxy', 1);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000','http://localhost:3001','http://localhost:3002','http://localhost:3003'];

app.use(cors({
  origin: [
    ...allowedOrigins,
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/
  ],
  credentials: true
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));

// Serve React frontend in production
const buildPath = path.resolve(__dirname, '..', 'frontend', 'build');
console.log('Build path:', buildPath);
console.log('Build exists:', fs.existsSync(buildPath));
if (fs.existsSync(buildPath)) {
  console.log('Build contents:', fs.readdirSync(buildPath));
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  console.log('WARNING: frontend/build not found! CWD:', process.cwd(), '__dirname:', __dirname);
  // List project structure for debugging
  try {
    const parentDir = path.resolve(__dirname, '..');
    console.log('Parent dir contents:', fs.readdirSync(parentDir));
    const frontendDir = path.resolve(__dirname, '..', 'frontend');
    if (fs.existsSync(frontendDir)) {
      console.log('Frontend dir contents:', fs.readdirSync(frontendDir));
    }
  } catch (e) { console.log('Debug error:', e.message); }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`GlobalEmail Hub server running on port ${PORT}`));




