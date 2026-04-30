const router = require('express').Router();
const { body, param, query } = require('express-validator');
const Schedule = require('../models/Schedule');
const Enrollment = require('../models/Enrollment');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');
const validate = require('../middleware/validate');

router.use(authenticate);

// Détecte les conflits de salle ou de prof sur un créneau
const checkConflict = async ({ room, teacher, dayOfWeek, startTime, endTime, excludeId }) => {
  const filter = {
    dayOfWeek,
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
    ],
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  };

  const roomConflict = await Schedule.findOne({ ...filter, room });
  if (roomConflict) return 'Salle déjà occupée sur ce créneau';

  const teacherConflict = await Schedule.findOne({ ...filter, teacher });
  if (teacherConflict) return 'Professeur déjà occupé sur ce créneau';

  return null;
};

// GET /api/schedule — vue globale (admin) ou personnelle (prof/élève)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'teacher') {
      filter.teacher = req.user._id;
    } else if (req.user.role === 'student') {
      // Récupère les cours validés de l'élève
      const enrollments = await Enrollment.find({ student: req.user._id, status: 'approved' }).lean();
      const courseIds = enrollments.map(e => e.course);
      filter.course = { $in: courseIds };
    } else if (req.query.teacher) {
      filter.teacher = req.query.teacher;
    } else if (req.query.room) {
      filter.room = req.query.room;
    } else if (req.query.course) {
      filter.course = req.query.course;
    }

    const schedules = await Schedule.find(filter)
      .populate('course', 'title')
      .populate('room', 'name')
      .populate('teacher', 'firstName lastName')
      .lean();

    res.json(schedules);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/schedule (admin)
router.post('/', authorize('admin'), [
  body('course').isMongoId(),
  body('room').isMongoId(),
  body('teacher').isMongoId(),
  body('dayOfWeek').isInt({ min: 0, max: 6 }),
  body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body('endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
], validate, async (req, res) => {
  try {
    const conflict = await checkConflict(req.body);
    if (conflict) return res.status(409).json({ message: conflict });
    const schedule = await Schedule.create(req.body);
    res.status(201).json(schedule);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// PUT /api/schedule/:id (admin)
router.put('/:id', authorize('admin'), [param('id').isMongoId()], validate, async (req, res) => {
  try {
    const conflict = await checkConflict({ ...req.body, excludeId: req.params.id });
    if (conflict) return res.status(409).json({ message: conflict });
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!schedule) return res.status(404).json({ message: 'Créneau introuvable' });
    res.json(schedule);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// DELETE /api/schedule/:id (admin)
router.delete('/:id', authorize('admin'), [param('id').isMongoId()], validate, async (req, res) => {
  try {
    await Schedule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Créneau supprimé' });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
