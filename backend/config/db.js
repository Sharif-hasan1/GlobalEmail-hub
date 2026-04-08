const mongoose = require('mongoose');
const dns = require('dns');

// Use Google DNS to fix SRV lookup issues on some networks
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mailstock');
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('MONGO_URI starts with:', (process.env.MONGO_URI || '').substring(0, 20) + '...');
  }
};

module.exports = connectDB;
