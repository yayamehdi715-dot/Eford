const router = require('express').Router();
const { body, param } = require('express-validator');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');
const validate = require('../middleware/validate');
const { deleteFile, getDownloadPresignedUrl } = require('../services/r2Service');
const { notifyCourseStudents } = require('../services/notificationService');
const { sendNewAssignment } = require('../services/emailService');
const User = require('../models/User');

router.use(authenticate);

// GET /api/assignments — liste selon le rôle
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    let filter = {};

    if (req.user.role === 'teacher') {
      filter.teacher = req.user._id;
    } else if (req.user.role === 'student') {
      const enrollments = await Enrollment.find({ student: req.user._id, status: 'approved' }).lean();
      filter.course = { $in: enrollments.map(e => e.course) };
    } else if (req.query.course) {
      filter.course = req.query.course;
    }

    const [assignments, total] = await Promise.all([
      Assignment.find(filter)
        .populate('course', 'title')
        .populate('teacher', 'firstName lastName')
        .lean()
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Assignment.countDocuments(filter),
    ]);

    res.json({ data: assignments, total, page, pages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/assignments (teacher/admin)
router.post('/', authorize('teacher', 'admin'), [
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('courseId').isMongoId(),
  body('fileKey').optional().trim(),
  body('fileName').optional().trim(),
  body('fileSize').optional().isInt({ min: 0 }),
  body('dueDate').optional().isISO8601(),
], validate, async (req, res) => {
  try {
    const course = await Course.findById(req.body.courseId);
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });

    if (req.user.role === 'teacher' && course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const assignment = await Assignment.create({
      title: req.body.title,
      description: req.body.description,
      teacher: req.user._id,
      course: course._id,
      fileKey: req.body.fileKey,
      fileName: req.body.fileName,
      fileSize: req.body.fileSize,
      dueDate: req.body.dueDate,
    });

    // Notifier les élèves inscrits
    const enrollments = await Enrollment.find({ course: course._id, status: 'approved' })
      .populate('student', 'firstName email')
      .lean();

    const studentIds = enrollments.map(e => e.student._id);
    await notifyCourseStudents(studentIds, {
      course: course._id,
      type: 'assignment',
      title: 'Nouveau devoir',
      message: `"${assignment.title}" a été publié dans ${course.title}`,
    });

    enrollments.forEach(({ student }) => {
      sendNewAssignment({
        email: student.email,
        firstName: student.firstName,
        courseTitle: course.title,
        assignmentTitle: assignment.title,
      }).catch(console.error);
    });

    res.status(201).json(assignment);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// GET /api/assignments/:id/download — URL presignée de téléchargement
router.get('/:id/download', [param('id').isMongoId()], validate, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).lean();
    if (!assignment) return res.status(404).json({ message: 'Devoir introuvable' });

    // Vérifier que l'élève est bien inscrit au cours
    if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: assignment.course,
        status: 'approved',
      });
      if (!enrollment) return res.status(403).json({ message: 'Accès refusé' });
    }

    if (!assignment.fileKey) return res.status(404).json({ message: 'Aucun fichier attaché' });

    const url = await getDownloadPresignedUrl(assignment.fileKey);
    res.json({ url, fileName: assignment.fileName });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// DELETE /api/assignments/:id (teacher qui possède le devoir / admin)
router.delete('/:id', authorize('teacher', 'admin'), [param('id').isMongoId()], validate, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Devoir introuvable' });
    if (req.user.role === 'teacher' && assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    // Supprimer le fichier de R2
    if (assignment.fileKey) {
      await deleteFile(assignment.fileKey).catch(console.error);
    }
    await assignment.deleteOne();
    res.json({ message: 'Devoir supprimé' });
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
