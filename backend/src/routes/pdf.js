const router = require('express').Router();
const { param } = require('express-validator');
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Schedule = require('../models/Schedule');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');
const validate = require('../middleware/validate');

router.use(authenticate);

// GET /api/pdf/attestation/:studentId — attestation de scolarité
router.get('/attestation/:studentId', [param('studentId').isMongoId()], validate, async (req, res) => {
  try {
    // Un élève peut générer sa propre attestation, l'admin peut le faire pour n'importe qui
    const targetId = req.user.role === 'student' ? req.user._id : req.params.studentId;
    const student = await User.findById(targetId).lean();
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Élève introuvable' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attestation-${student.lastName}.pdf"`);

    const doc = new PDFDocument({ margin: 80 });
    doc.pipe(res);

    doc.fontSize(22).text('ATTESTATION DE SCOLARITÉ', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(12).text(`Je soussigné(e), certifie que`, { align: 'left' });
    doc.moveDown();
    doc.fontSize(14).text(`${student.firstName} ${student.lastName}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`est régulièrement inscrit(e) dans notre établissement pour l'année en cours.`, { align: 'left' });
    doc.moveDown(3);
    doc.text(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.moveDown();
    doc.text('Signature :', { align: 'right' });
    doc.end();
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// GET /api/pdf/course-students/:courseId — liste des élèves d'un cours
router.get('/course-students/:courseId', authorize('admin', 'teacher'), [param('courseId').isMongoId()], validate, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .populate('teacher', 'firstName lastName')
      .lean();
    if (!course) return res.status(404).json({ message: 'Cours introuvable' });

    const enrollments = await Enrollment.find({ course: req.params.courseId, status: 'approved' })
      .populate('student', 'firstName lastName email')
      .lean();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="eleves-${course.title}.pdf"`);

    const doc = new PDFDocument({ margin: 60 });
    doc.pipe(res);

    doc.fontSize(18).text(`Liste des élèves : ${course.title}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Enseignant : ${course.teacher.firstName} ${course.teacher.lastName}`);
    doc.text(`Nombre d'inscrits : ${enrollments.length} / ${course.maxStudents}`);
    doc.moveDown();

    enrollments.forEach((e, i) => {
      doc.fontSize(11).text(`${i + 1}. ${e.student.firstName} ${e.student.lastName} — ${e.student.email}`);
    });

    doc.end();
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// GET /api/pdf/schedule/:userId — emploi du temps en PDF
router.get('/schedule/:userId', [param('userId').isMongoId()], validate, async (req, res) => {
  try {
    const targetId = req.user.role === 'admin' ? req.params.userId : req.user._id;
    const user = await User.findById(targetId).lean();
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    const filter = user.role === 'teacher'
      ? { teacher: targetId }
      : { course: { $in: (await Enrollment.find({ student: targetId, status: 'approved' }).lean()).map(e => e.course) } };

    const schedules = await Schedule.find(filter)
      .populate('course', 'title')
      .populate('room', 'name')
      .lean();

    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="emploi-du-temps.pdf"');

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(18).text(`Emploi du temps — ${user.firstName} ${user.lastName}`, { align: 'center' });
    doc.moveDown();

    const byDay = schedules.reduce((acc, s) => {
      acc[s.dayOfWeek] = acc[s.dayOfWeek] || [];
      acc[s.dayOfWeek].push(s);
      return acc;
    }, {});

    [1, 2, 3, 4, 5, 6].forEach(day => {
      if (byDay[day]) {
        doc.fontSize(13).text(days[day], { underline: true });
        byDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime)).forEach(s => {
          doc.fontSize(11).text(
            `  ${s.startTime}–${s.endTime} | ${s.course.title} | Salle : ${s.room?.name || '—'}`,
            { indent: 10 }
          );
        });
        doc.moveDown(0.5);
      }
    });

    doc.end();
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
