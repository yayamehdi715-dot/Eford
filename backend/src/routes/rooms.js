const router = require('express').Router();
const { body, param } = require('express-validator');
const Room = require('../models/Room');
const Schedule = require('../models/Schedule');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');
const validate = require('../middleware/validate');

router.use(authenticate);

// GET /api/rooms
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find().lean().sort({ name: 1 });
    res.json(rooms);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/rooms (admin)
router.post('/', authorize('admin'), [
  body('name').trim().notEmpty().isLength({ max: 50 }),
  body('capacity').isInt({ min: 1, max: 500 }),
  body('equipment').optional().trim().isLength({ max: 500 }),
  body('isAvailable').optional().isBoolean(),
], validate, async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json(room);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// PUT /api/rooms/:id (admin)
router.put('/:id', authorize('admin'), [
  param('id').isMongoId(),
  body('name').optional().trim().notEmpty().isLength({ max: 50 }),
  body('capacity').optional().isInt({ min: 1, max: 500 }),
  body('equipment').optional().trim().isLength({ max: 500 }),
  body('isAvailable').optional().isBoolean(),
], validate, async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!room) return res.status(404).json({ message: 'Salle introuvable' });
    res.json(room);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// DELETE /api/rooms/:id (admin)
router.delete('/:id', authorize('admin'), [param('id').isMongoId()], validate, async (req, res) => {
  try {
    // Vérifie qu'aucun cours n'utilise cette salle avant suppression
    const inUse = await Schedule.findOne({ room: req.params.id });
    if (inUse) return res.status(409).json({ message: 'Salle utilisée dans un emploi du temps' });
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ message: 'Salle introuvable' });
    res.json({ message: 'Salle supprimée' });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
