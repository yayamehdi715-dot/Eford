const router = require('express').Router();
const { body, param } = require('express-validator');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');
const validate = require('../middleware/validate');
const { createNotification } = require('../services/notificationService');
const { sendEnrollmentResult } = require('../services/emailService');

router.use(authenticate, authorize('student'));

// POST /api/student/enroll — s'inscrire à un cours
router.post('/enroll', [
  body('courseId').isMongoId(),
], validate, async (req, res) => {
  try {
    const course = await Course.findById(req.body.courseId);
    if (!course || !course.isActive) return res.status(404).json({ message: 'Cours introuvable' });

    const existing = await Enrollment.findOne({ student: req.user._id, course: course._id });
    if (existing) return res.status(409).json({ message: 'Déjà inscrit à ce cours' });

    // Vérifier la capacité max
    const count = await Enrollment.countDocuments({ course: course._id, status: 'approved' });
    if (count >= course.maxStudents) return res.status(409).json({ message: 'Cours complet' });

    const status = course.requiresApproval ? 'pending' : 'approved';
    const enrollment = await Enrollment.create({
      student: req.user._id,
      course: course._id,
      status,
    });

    if (status === 'pending') {
      // Notifier l'admin
      await createNotification({
        type: 'enrollment',
        title: 'Nouvelle demande d\'inscription',
        message: `${req.user.firstName} ${req.user.lastName} demande à rejoindre "${course.title}"`,
      });
    }

    res.status(201).json({ enrollment, message: status === 'approved' ? 'Inscription confirmée' : 'Demande envoyée, en attente de validation' });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// GET /api/student/enrollments — mes inscriptions
router.get('/enrollments', async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user._id })
      .populate({ path: 'course', populate: { path: 'teacher', select: 'firstName lastName' } })
      .lean()
      .sort({ enrolledAt: -1 });
    res.json(enrollments);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// DELETE /api/student/enroll/:courseId — se désinscrire
router.delete('/enroll/:courseId', [param('courseId').isMongoId()], validate, async (req, res) => {
  try {
    const enrollment = await Enrollment.findOneAndDelete({
      student: req.user._id,
      course: req.params.courseId,
    });
    if (!enrollment) return res.status(404).json({ message: 'Inscription introuvable' });
    res.json({ message: 'Désinscrit' });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
