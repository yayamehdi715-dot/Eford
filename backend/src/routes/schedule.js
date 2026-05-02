const router = require('express').Router();
const { body, param, query } = require('express-validator');
const Schedule = require('../models/Schedule');
const Course   = require('../models/Course');
const Room     = require('../models/Room');
const Enrollment = require('../models/Enrollment');
const authenticate = require('../middleware/auth');
const authorize    = require('../middleware/roles');
const validate     = require('../middleware/validate');

router.use(authenticate);

// ── Utilitaire : conflits de salle (et de prof si fourni) ─────────────────────
const checkConflict = async ({ room, teacher, dayOfWeek, startTime, endTime, excludeId }) => {
  const filter = {
    dayOfWeek,
    startTime: { $lt: endTime },
    endTime:   { $gt: startTime },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  };

  const roomConflict = await Schedule.findOne({ ...filter, room });
  if (roomConflict) return 'Salle déjà occupée sur ce créneau';

  if (teacher) {
    const teacherConflict = await Schedule.findOne({ ...filter, teacher });
    if (teacherConflict) return 'Professeur déjà occupé sur ce créneau';
  }

  return null;
};

// GET /api/schedule/rooms/available?dayOfWeek=1&startTime=08:00&endTime=10:00&excludeId=
// Retourne les salles libres pour un créneau donné
router.get('/rooms/available', async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime, excludeId } = req.query;
    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ message: 'dayOfWeek, startTime et endTime sont requis' });
    }

    const filter = {
      dayOfWeek: Number(dayOfWeek),
      startTime: { $lt: endTime },
      endTime:   { $gt: startTime },
    };
    if (excludeId) filter._id = { $ne: excludeId };

    const occupiedSlots = await Schedule.find(filter).select('room').lean();
    const occupiedRoomIds = occupiedSlots.map(s => s.room?.toString()).filter(Boolean);

    const allRooms = await Room.find().lean();
    const available = allRooms.map(r => ({
      ...r,
      occupied: occupiedRoomIds.includes(r._id.toString()),
    }));

    res.json(available);
  } catch (err) {
    console.error('[schedule/rooms/available]', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/schedule — vue globale (admin) ou personnelle (prof/élève)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'teacher') {
      filter.teacher = req.user._id;
    } else if (req.user.role === 'student') {
      const enrollments = await Enrollment.find({ student: req.user._id, status: 'approved' }).lean();
      filter.course = { $in: enrollments.map(e => e.course) };
    } else {
      if (req.query.teacher) filter.teacher = req.query.teacher;
      if (req.query.room)    filter.room    = req.query.room;
      if (req.query.course)  filter.course  = req.query.course;
    }

    const schedules = await Schedule.find(filter)
      .populate('course',  'title')
      .populate('room',    'name')
      .populate('teacher', 'firstName lastName')
      .lean();

    res.json(schedules);
  } catch (err) {
    console.error('[schedule GET]', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/schedule (admin)
// Accepte `days` (tableau d'objets { dayOfWeek, startTime, endTime }) pour créer
// plusieurs créneaux d'un coup avec des horaires différents par jour.
// Le teacher est auto-rempli depuis le cours — inutile de le préciser.
router.post('/', authorize('admin'), [
  body('course').isMongoId().withMessage('Cours requis'),
  body('room').isMongoId().withMessage('Salle requise'),
  body('days').isArray({ min: 1 }).withMessage('Sélectionnez au moins un jour'),
  body('days.*.dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('Jour invalide'),
  body('days.*.startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Heure de début invalide'),
  body('days.*.endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Heure de fin invalide'),
], validate, async (req, res) => {
  try {
    const { course: courseId, room, days } = req.body;

    // Vérification start < end pour chaque jour
    for (const { dayOfWeek, startTime, endTime } of days) {
      if (startTime >= endTime) {
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        return res.status(400).json({
          message: `${dayNames[dayOfWeek]} : l'heure de fin doit être après l'heure de début`,
        });
      }
    }

    // Récupération du prof depuis le cours
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });
    const teacher = course.teacher;

    // Vérification des conflits pour chaque jour sélectionné
    const conflicts = [];
    for (const { dayOfWeek, startTime, endTime } of days) {
      const conflict = await checkConflict({ room, teacher, dayOfWeek, startTime, endTime });
      if (conflict) {
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        conflicts.push(`${dayNames[dayOfWeek]} : ${conflict}`);
      }
    }
    if (conflicts.length > 0) {
      return res.status(409).json({ message: conflicts.join(' | ') });
    }

    // Création d'un créneau par jour
    const created = await Schedule.insertMany(
      days.map(({ dayOfWeek, startTime, endTime }) => ({
        course: courseId, room, teacher, dayOfWeek, startTime, endTime,
      }))
    );

    res.status(201).json(created);
  } catch (err) {
    console.error('[schedule POST]', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /api/schedule/:id (admin)
router.put('/:id', authorize('admin'), [
  param('id').isMongoId(),
  body('course').optional().isMongoId(),
  body('room').optional().isMongoId(),
  body('dayOfWeek').optional().isInt({ min: 0, max: 6 }),
  body('startTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body('endTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/),
], validate, async (req, res) => {
  try {
    const existing = await Schedule.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Créneau introuvable' });

    const updates = {};
    if (req.body.room      !== undefined) updates.room      = req.body.room;
    if (req.body.dayOfWeek !== undefined) updates.dayOfWeek = req.body.dayOfWeek;
    if (req.body.startTime !== undefined) updates.startTime = req.body.startTime;
    if (req.body.endTime   !== undefined) updates.endTime   = req.body.endTime;

    // Si le cours change, re-récupérer le prof
    if (req.body.course !== undefined) {
      updates.course = req.body.course;
      const course = await Course.findById(req.body.course);
      if (!course) return res.status(404).json({ message: 'Cours introuvable' });
      updates.teacher = course.teacher;
    }

    const merged = { ...existing.toObject(), ...updates };
    const conflict = await checkConflict({ ...merged, excludeId: req.params.id });
    if (conflict) return res.status(409).json({ message: conflict });

    const schedule = await Schedule.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('course', 'title')
      .populate('room', 'name')
      .populate('teacher', 'firstName lastName');

    res.json(schedule);
  } catch (err) {
    console.error('[schedule PUT]', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// DELETE /api/schedule/:id (admin)
router.delete('/:id', authorize('admin'), [param('id').isMongoId()], validate, async (req, res) => {
  try {
    await Schedule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Créneau supprimé' });
  } catch (err) {
    console.error('[schedule DELETE]', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;

// 📁 Emplacement : Eford-main/backend/src/routes/schedule.js
