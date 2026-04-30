const router = require('express').Router();
const User = require('../models/User');

// Route à appeler une seule fois pour créer l'admin
// Protégée par SEED_SECRET pour éviter tout abus
router.get('/', async (req, res) => {
  const secret = req.query.secret;
  if (!secret || secret !== process.env.SEED_SECRET) {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  try {
    const existing = await User.findOne({ role: 'admin' });
    if (existing) {
      return res.json({ message: 'Admin existe déjà', email: existing.email });
    }

    const email    = process.env.ADMIN_EMAIL    || 'admin@admin.com';
    const password = process.env.ADMIN_PASSWORD || 'admin';

    await User.create({
      firstName: 'Admin',
      lastName: 'Eford',
      email,
      password,
      role: 'admin',
      isActive: true,
    });

    res.json({ message: 'Compte admin créé', email, password });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
