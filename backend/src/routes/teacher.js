const router = require('express').Router();
const { body } = require('express-validator');
const Course = require('../models/Course');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roles');
const validate = require('../middleware/validate');

router.use(authenticate, authorize('teacher'));

// GET /api/teacher/my-courses
router.get('/my-courses', async (req, res) => {
  try {
    const courses = await Course.find({ teacher: req.user._id, isActive: true })
      .populate('room', 'name capacity')
      .lean();
    res.json(courses);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

// PATCH /api/teacher/profile — mise à jour du profil
router.patch('/profile', [
  body('firstName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('lastName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('password').optional().isLength({ min: 8, max: 72 }),
], validate, async (req, res) => {
  try {
    const User = require('../models/User');
    const updates = {};
    if (req.body.firstName) updates.firstName = req.body.firstName;
    if (req.body.lastName) updates.lastName = req.body.lastName;
    if (req.body.phone) updates.phone = req.body.phone;
    if (req.body.password) {
      const bcrypt = require('bcryptjs');
      updates.password = await bcrypt.hash(req.body.password, 12);
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json(user);
  } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
