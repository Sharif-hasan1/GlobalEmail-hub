require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const User = require('./models/User');

const products = [
  {
    title: 'Gmail Accounts | 6 months old',
    description:
      'Gmail Accounts | The accounts are 6 months old. 2FA included. Backup codes included. Accounts registered using IP addresses from different countries.',
    category: 'Gmail',
    provider: 'Gmail',
    icon: 'gmail',
    stock: 267,
    price: 0.75,
    active: true,
    featured: true
  },
  {
    title: 'Gmail Accounts | Registered in 2023',
    description:
      'Gmail Accounts | Registered in 2023. 2FA included. Backup codes included. Accounts verified via phone number. All accounts are aged and fully active.',
    category: 'Gmail',
    provider: 'Gmail',
    icon: 'gmail',
    stock: 392,
    price: 0.9,
    active: true,
    featured: true
  },
  {
    title: 'Gmail Accounts | Mixed years 2019–2023',
    description:
      'Gmail Accounts | Mixed creation years from 2019 to 2023. 2FA enabled. Backup codes provided. Registered from various international IPs.',
    category: 'Gmail',
    provider: 'Gmail',
    icon: 'gmail',
    stock: 104,
    price: 0.96,
    active: true
  },
  {
    title: 'Gmail Accounts | Mixed years 2010–2022',
    description:
      'Gmail Accounts | High-aged accounts with creation years between 2010 and 2022. 2FA included. Backup codes included. Premium aged accounts with long history.',
    category: 'Gmail',
    provider: 'Gmail',
    icon: 'gmail',
    stock: 27,
    price: 1.125,
    active: true
  },
  {
    title: 'Gmail Accounts | Mixed years 2010–2015',
    description:
      'Gmail Accounts | Ultra-aged accounts created between 2010 and 2015. 2FA enabled. Backup codes included. These accounts carry over 10 years of history.',
    category: 'Gmail',
    provider: 'Gmail',
    icon: 'gmail',
    stock: 86,
    price: 1.95,
    active: true
  },
  {
    title: 'Outlook Accounts | 1 year old',
    description:
      'Outlook/Hotmail Accounts | 1 year old. Full access. Backup email included. Registered from EU and US IP addresses.',
    category: 'Outlook',
    provider: 'Outlook',
    icon: 'outlook',
    stock: 145,
    price: 0.65,
    active: true
  },
  {
    title: 'Yahoo Mail Accounts | Mixed years 2018–2022',
    description:
      'Yahoo Mail Accounts | Mixed creation years from 2018 to 2022. Full account access. Recovery information included.',
    category: 'Yahoo',
    provider: 'Yahoo',
    icon: 'yahoo',
    stock: 78,
    price: 0.85,
    active: true
  }
];

const seedDB = async () => {
  await connectDB();
  try {
    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log(`✓ Seeded ${products.length} products`);

    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(12);
      const hashed = await bcrypt.hash('admin123', salt);
      await User.create({ username: 'admin', email: 'admin@mailstock.com', password: hashed, role: 'admin' });
      console.log('✓ Admin user created: admin@mailstock.com / admin123');
    }

    console.log('✓ Database seeded successfully');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    mongoose.connection.close();
  }
};

seedDB();
