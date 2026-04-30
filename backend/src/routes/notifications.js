const router = require('express').Router();
const { body, param } = require('express-validator');
const Notification = require('../models/Notification');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');
const validate = require('../middleware/validate');

router.use(authenticate);

// GET /api/notifications — mes notifications
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const filter = {
      $or: [{ recipient: req.user._id }, { recipient: null }],
    };
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .lean()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, isRead: false }),
    ]);
    res.json({ data: notifications, total, page, pages: Math.ceil(total / limit), unreadCount });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// PATCH /api/notifications/:id/read — marquer comme lue
router.patch('/:id/read', [param('id').isMongoId()], validate, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true }
    );
    res.json({ message: 'Marquée comme lue' });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// PATCH /api/notifications/read-all — tout marquer comme lu
router.patch('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { $or: [{ recipient: req.user._id }, { recipient: null }], isRead: false },
      { isRead: true }
    );
    res.json({ message: 'Toutes marquées comme lues' });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/notifications/broadcast (admin) — envoyer à tous ou à un rôle
router.post('/broadcast', authorize('admin'), [
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('message').trim().notEmpty().isLength({ max: 1000 }),
  body('role').optional().isIn(['teacher', 'student', 'all']),
  body('type').isIn(['absence', 'assignment', 'enrollment', 'general']),
], validate, async (req, res) => {
  try {
    const { title, message, role, type } = req.body;
    if (!role || role === 'all') {
      // Notification broadcast (recipient null)
      await Notification.create({ type, title, message, recipient: null });
    } else {
      const users = await User.find({ role, isActive: true }).lean().select('_id');
      const docs = users.map(u => ({ recipient: u._id, type, title, message }));
      await Notification.insertMany(docs);
    }
    res.status(201).json({ message: 'Notification envoyée' });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
