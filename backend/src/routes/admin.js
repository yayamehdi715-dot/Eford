const router = require('express').Router();
const { body, param, query } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');
const validate = require('../middleware/validate');
const { sendWelcomeTeacher } = require('../services/emailService');

router.use(authenticate, authorize('admin'));

// GET /api/admin/teachers?page=1&search=
router.get('/teachers', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const search = req.query.search?.trim();
    const filter = { role: 'teacher' };
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }
    const [teachers, total] = await Promise.all([
      User.find(filter).lean().skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);
    res.json({ data: teachers, total, page, pages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/admin/teachers — créer un compte prof + envoyer email
router.post('/teachers', [
  body('firstName').trim().notEmpty().isLength({ max: 50 }),
  body('lastName').trim().notEmpty().isLength({ max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 20 }),
], validate, async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email déjà utilisé' });

    // Mot de passe temporaire aléatoire
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const user = await User.create({ firstName, lastName, email, phone, password: tempPassword, role: 'teacher' });

    // Envoi email avec les identifiants
    try {
      await sendWelcomeTeacher({ email, firstName, tempPassword });
    } catch (emailErr) {
      console.error('Email non envoyé:', emailErr.message);
    }

    res.status(201).json(user);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// GET /api/admin/students?page=1&search=
router.get('/students', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const search = req.query.search?.trim();
    const filter = { role: 'student' };
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }
    const [students, total] = await Promise.all([
      User.find(filter).lean().skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);
    res.json({ data: students, total, page, pages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// PATCH /api/admin/users/:id/toggle — activer/désactiver un compte
router.patch('/users/:id/toggle', [
  param('id').isMongoId(),
], validate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Impossible de modifier un admin' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ isActive: user.isActive });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', [param('id').isMongoId()], validate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Introuvable' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Impossible de supprimer un admin' });
    await user.deleteOne();
    res.json({ message: 'Supprimé' });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
