const router = require('express').Router();
const { param, body } = require('express-validator');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');
const validate = require('../middleware/validate');
const { createNotification } = require('../services/notificationService');
const { sendEnrollmentResult } = require('../services/emailService');

router.use(authenticate, authorize('admin'));

// GET /api/enrollments?status=pending&page=1
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.course) filter.course = req.query.course;

    const [enrollments, total] = await Promise.all([
      Enrollment.find(filter)
        .populate('student', 'firstName lastName email')
        .populate('course', 'title requiresApproval')
        .lean()
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ enrolledAt: -1 }),
      Enrollment.countDocuments(filter),
    ]);
    res.json({ data: enrollments, total, page, pages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// PATCH /api/enrollments/:id/approve
router.patch('/:id/approve', [param('id').isMongoId()], validate, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title');
    if (!enrollment) return res.status(404).json({ message: 'Inscription introuvable' });
    if (enrollment.status !== 'pending') {
      return res.status(409).json({ message: 'Inscription déjà traitée' });
    }
    enrollment.status = 'approved';
    enrollment.approvedAt = new Date();
    enrollment.approvedBy = req.user._id;
    await enrollment.save();

    await createNotification({
      recipient: enrollment.student._id,
      course: enrollment.course._id,
      type: 'enrollment',
      title: 'Inscription approuvée',
      message: `Votre inscription à "${enrollment.course.title}" a été approuvée.`,
    });

    sendEnrollmentResult({
      email: enrollment.student.email,
      firstName: enrollment.student.firstName,
      courseTitle: enrollment.course.title,
      status: 'approved',
    }).catch(console.error);

    res.json(enrollment);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// PATCH /api/enrollments/:id/reject
router.patch('/:id/reject', [param('id').isMongoId()], validate, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title');
    if (!enrollment) return res.status(404).json({ message: 'Inscription introuvable' });
    if (enrollment.status !== 'pending') {
      return res.status(409).json({ message: 'Inscription déjà traitée' });
    }
    enrollment.status = 'rejected';
    enrollment.approvedBy = req.user._id;
    await enrollment.save();

    await createNotification({
      recipient: enrollment.student._id,
      course: enrollment.course._id,
      type: 'enrollment',
      title: 'Inscription refusée',
      message: `Votre demande pour "${enrollment.course.title}" a été refusée.`,
    });

    sendEnrollmentResult({
      email: enrollment.student.email,
      firstName: enrollment.student.firstName,
      courseTitle: enrollment.course.title,
      status: 'rejected',
    }).catch(console.error);

    res.json(enrollment);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
