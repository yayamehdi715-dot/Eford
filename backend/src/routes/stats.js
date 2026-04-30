const router = require('express').Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Absence = require('../models/Absence');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');

router.use(authenticate, authorize('admin'));

// GET /api/stats — statistiques globales
router.get('/', async (req, res) => {
  try {
    const [
      totalStudents,
      totalTeachers,
      totalCourses,
      pendingEnrollments,
      enrollmentsByMonth,
      popularCourses,
      absencesByUser,
    ] = await Promise.all([
      User.countDocuments({ role: 'student', isActive: true }),
      User.countDocuments({ role: 'teacher', isActive: true }),
      Course.countDocuments({ isActive: true }),
      Enrollment.countDocuments({ status: 'pending' }),

      // Inscriptions par mois (12 derniers mois)
      Enrollment.aggregate([
        { $match: { status: 'approved', enrolledAt: { $gte: new Date(Date.now() - 365 * 24 * 3600 * 1000) } } },
        { $group: { _id: { year: { $year: '$enrolledAt' }, month: { $month: '$enrolledAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // Cours les plus populaires
      Enrollment.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$course', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
        { $unwind: '$course' },
        { $project: { title: '$course.title', count: 1 } },
      ]),

      // Élèves avec le plus d'absences
      Absence.aggregate([
        { $match: { type: 'student' } },
        { $group: { _id: '$user', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { firstName: '$user.firstName', lastName: '$user.lastName', count: 1 } },
      ]),
    ]);

    // Taux de présence global
    const [totalSessions, totalAbsences] = await Promise.all([
      Enrollment.countDocuments({ status: 'approved' }),
      Absence.countDocuments({ type: 'student' }),
    ]);
    const attendanceRate = totalSessions > 0
      ? Math.round(((totalSessions - totalAbsences) / totalSessions) * 100)
      : 100;

    res.json({
      overview: { totalStudents, totalTeachers, totalCourses, pendingEnrollments, attendanceRate },
      enrollmentsByMonth,
      popularCourses,
      absencesByUser,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
