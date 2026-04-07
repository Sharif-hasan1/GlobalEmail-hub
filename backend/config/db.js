const mongoose = require('mongoose');

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
