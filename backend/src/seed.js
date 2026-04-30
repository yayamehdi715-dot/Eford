require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connecté à MongoDB...');

  const email    = process.env.ADMIN_EMAIL    || 'admin@eford.fr';
  const password = process.env.ADMIN_PASSWORD || 'Admin1234!';

  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    console.log('Un compte admin existe déjà :', existing.email);
    process.exit(0);
  }

  const admin = await User.create({
    firstName: 'Admin',
    lastName: 'Eford',
    email,
    password,
    role: 'admin',
    isActive: true,
  });

  console.log('Compte admin créé :');
  console.log('  Email    :', admin.email);
  console.log('  Password :', password);
  process.exit(0);
};

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
