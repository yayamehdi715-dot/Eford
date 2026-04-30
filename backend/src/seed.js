require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connecté à MongoDB...');

  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    console.log('Un compte admin existe déjà :', existing.email);
    process.exit(0);
  }

  const admin = await User.create({
    firstName: 'Admin',
    lastName: 'Eford',
    email: 'admin@eford.fr',
    password: 'Admin1234!',
    role: 'admin',
    isActive: true,
  });

  console.log('Compte admin créé :');
  console.log('  Email    :', admin.email);
  console.log('  Password : Admin1234!');
  console.log('Changez ce mot de passe dès la première connexion !');
  process.exit(0);
};

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
