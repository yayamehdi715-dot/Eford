const router = require('express').Router();
const { body, param, query } = require('express-validator');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');
const validate = require('../middleware/validate');

router.use(authenticate);

// GET /api/courses — liste des cours actifs (tous les rôles)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const search = req.query.search?.trim();
    const filter = { isActive: true };
    if (search) filter.title = new RegExp(search, 'i');
    // Les profs voient seulement leurs cours
    if (req.user.role === 'teacher') filter.teacher = req.user._id;

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate('teacher', 'firstName lastName')
        .populate('room', 'name')
        .lean()
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Course.countDocuments(filter),
    ]);

    // Ajouter le nombre d'inscrits approuvés pour chaque cours
    const courseIds = courses.map(c => c._id);
    const counts = await Enrollment.aggregate([
      { $match: { course: { $in: courseIds }, status: 'approved' } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map(c => [c._id.toString(), c.count]));
    const data = courses.map(c => ({ ...c, enrolledCount: countMap[c._id.toString()] || 0 }));

    res.json({ data, total, page, pages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// GET /api/courses/:id
router.get('/:id', [param('id').isMongoId()], validate, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('teacher', 'firstName lastName email')
      .populate('room')
      .lean();
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });
    res.json(course);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/courses (admin seulement)
router.post('/', authorize('admin'), [
  body('title').trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('teacher').isMongoId(),
  body('room').optional().isMongoId(),
  body('maxStudents').isInt({ min: 1, max: 500 }),
  body('requiresApproval').isBoolean(),
], validate, async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json(course);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// PUT /api/courses/:id (admin seulement)
router.put('/:id', authorize('admin'), [
  param('id').isMongoId(),
  body('title').optional().trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('teacher').optional().isMongoId(),
  body('room').optional().isMongoId(),
  body('maxStudents').optional().isInt({ min: 1, max: 500 }),
  body('requiresApproval').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
], validate, async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });
    res.json(course);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// DELETE /api/courses/:id (admin seulement)
router.delete('/:id', authorize('admin'), [param('id').isMongoId()], validate, async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });
    res.json({ message: 'Cours supprimé' });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// GET /api/courses/:id/students — liste des élèves inscrits (admin/teacher)
router.get('/:id/students', authorize('admin', 'teacher'), [param('id').isMongoId()], validate, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ course: req.params.id, status: 'approved' })
      .populate('student', 'firstName lastName email phone')
      .lean();
    res.json(enrollments.map(e => e.student));
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
