const router = require('express').Router();
const { body, param } = require('express-validator');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');
const validate = require('../middleware/validate');

router.use(authenticate, authorize('admin'));

// GET /api/admin/teachers — inclut plainPassword pour que l'admin puisse le voir
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
        { username: new RegExp(search, 'i') },
      ];
    }
    const [teachers, total] = await Promise.all([
      User.find(filter).select('+plainPassword').lean().skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);
    res.json({ data: teachers, total, page, pages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/admin/teachers — l'admin choisit username + mot de passe
router.post('/teachers', [
  body('firstName').trim().notEmpty().isLength({ max: 50 }),
  body('lastName').trim().notEmpty().isLength({ max: 50 }),
  body('username').trim().notEmpty().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9._-]+$/),
  body('password').notEmpty().isLength({ min: 4, max: 72 }),
  body('phone').optional().trim().isLength({ max: 20 }),
], validate, async (req, res) => {
  try {
    const { firstName, lastName, username, password, phone } = req.body;
    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Ce nom d\'utilisateur est déjà pris' });

    const user = await User.create({
      firstName, lastName, username: username.toLowerCase(),
      password, plainPassword: password,
      phone, role: 'teacher',
    });

    // Retourne le plainPassword pour que l'admin puisse le voir
    const result = user.toObject();
    result.plainPassword = password;
    delete result.password;
    delete result.refreshToken;
    res.status(201).json(result);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// PATCH /api/admin/teachers/:id — l'admin peut modifier username/password
router.patch('/teachers/:id', [
  param('id').isMongoId(),
  body('username').optional().trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9._-]+$/),
  body('password').optional().isLength({ min: 4, max: 72 }),
  body('firstName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('lastName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('phone').optional().trim().isLength({ max: 20 }),
], validate, async (req, res) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' }).select('+plainPassword');
    if (!teacher) return res.status(404).json({ message: 'Professeur introuvable' });

    if (req.body.username) teacher.username = req.body.username.toLowerCase();
    if (req.body.firstName) teacher.firstName = req.body.firstName;
    if (req.body.lastName) teacher.lastName = req.body.lastName;
    if (req.body.phone !== undefined) teacher.phone = req.body.phone;
    if (req.body.password) {
      teacher.plainPassword = req.body.password;
      teacher.password = req.body.password; // sera hashé par le pre-save hook
    }
    await teacher.save();

    const result = teacher.toObject();
    delete result.password;
    delete result.refreshToken;
    res.json(result);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// GET /api/admin/students
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

// PATCH /api/admin/users/:id/toggle
router.patch('/users/:id/toggle', [param('id').isMongoId()], validate, async (req, res) => {
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
