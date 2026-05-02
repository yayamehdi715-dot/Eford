const router = require('express').Router();
const { body, param, query } = require('express-validator');
const Absence = require('../models/Absence');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');
const validate = require('../middleware/validate');
const { notifyCourseStudents, createNotification } = require('../services/notificationService');
const { sendTeacherAbsenceNotification } = require('../services/emailService');
const User = require('../models/User');

router.use(authenticate);

// GET /api/absences — liste selon le rôle
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const filter = {};

    if (req.user.role === 'student') {
      filter.user = req.user._id;
      filter.type = 'student';
    } else if (req.user.role === 'teacher') {
      filter.user = req.user._id;
      filter.type = 'teacher';
    } else {
      // Admin : filtres optionnels
      if (req.query.user) filter.user = req.query.user;
      if (req.query.course) filter.course = req.query.course;
      if (req.query.type) filter.type = req.query.type;
      if (req.query.from || req.query.to) {
        filter.date = {};
        if (req.query.from) filter.date.$gte = new Date(req.query.from);
        if (req.query.to) filter.date.$lte = new Date(req.query.to);
      }
    }

    const [absences, total] = await Promise.all([
      Absence.find(filter)
        .populate('user', 'firstName lastName role')
        .populate('course', 'title')
        .lean()
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ date: -1 }),
      Absence.countDocuments(filter),
    ]);
    res.json({ data: absences, total, page, pages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/absences/teacher — prof signale sa propre absence
router.post('/teacher', authorize('teacher', 'admin'), [
  body('courseId').isMongoId(),
  body('date').isISO8601(),
  body('reason').optional().trim().isLength({ max: 500 }),
], validate, async (req, res) => {
  try {
    const course = await Course.findById(req.body.courseId);
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });

    // Autoriser seulement le prof du cours (ou admin)
    if (req.user.role === 'teacher' && course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const absence = await Absence.create({
      user: req.user._id,
      course: course._id,
      date: req.body.date,
      type: 'teacher',
      reason: req.body.reason,
    });

    // Récupérer les élèves inscrits et les notifier
    const enrollments = await Enrollment.find({ course: course._id, status: 'approved' })
      .populate('student', 'firstName lastName email')
      .lean();

    const studentIds = enrollments.map(e => e.student._id);
    await notifyCourseStudents(studentIds, {
      course: course._id,
      type: 'absence',
      title: 'Cours annulé',
      message: `Le cours "${course.title}" du ${new Date(req.body.date).toLocaleDateString('fr-FR')} est annulé.`,
    });

    // Emails en arrière-plan
    enrollments.forEach(({ student }) => {
      sendTeacherAbsenceNotification({
        email: student.email,
        firstName: student.firstName,
        courseTitle: course.title,
        date: req.body.date,
      }).catch(console.error);
    });

    await Absence.findByIdAndUpdate(absence._id, { notified: true });
    res.status(201).json(absence);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/absences/students — prof fait l'appel et enregistre les absences élèves
router.post('/students', authorize('teacher', 'admin'), [
  body('courseId').isMongoId(),
  body('date').isISO8601(),
  body('absentStudentIds').isArray(),
  body('absentStudentIds.*').isMongoId(),
], validate, async (req, res) => {
  try {
    const { courseId, date, absentStudentIds } = req.body;

    // Vérifier accès du prof
    if (req.user.role === 'teacher') {
      const course = await Course.findById(courseId);
      if (!course || course.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Accès refusé' });
      }
    }

    // Récupérer les infos du cours pour les notifications
    const course = await Course.findById(courseId);
    const dateStr = new Date(date).toLocaleDateString('fr-FR');

    // Créer les absences en évitant les doublons
    const absences = await Promise.all(
      absentStudentIds.map(studentId =>
        Absence.findOneAndUpdate(
          { user: studentId, course: courseId, date: new Date(date) },
          { user: studentId, course: courseId, date, type: 'student' },
          { upsert: true, new: true }
        )
      )
    );

    // Notifier chaque élève absent
    if (course) {
      await Promise.all(
        absentStudentIds.map(studentId =>
          createNotification({
            recipient: studentId,
            course: courseId,
            type: 'absence',
            title: 'Absence enregistrée',
            message: `Une absence a été enregistrée pour le cours "${course.title}" le ${dateStr}.`,
          }).catch(console.error)
        )
      );
    }

    res.status(201).json(absences);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
