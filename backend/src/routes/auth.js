const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// POST /api/auth/login — staff (admin + profs) : login par username
router.post('/login', authLimiter, [
  body('username').trim().notEmpty(),
  body('password').notEmpty(),
], validate, async (req, res) => {
  try {
    const { username, password } = req.body;
    // Cherche par username (profs) ou email (admin)
    const user = await User.findOne({
      $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }],
      role: { $in: ['admin', 'teacher'] },
    }).select('+password +refreshToken');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Identifiants incorrects' });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/auth/student-login — élèves uniquement : login par email
router.post('/student-login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: 'student' }).select('+password +refreshToken');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Identifiants incorrects' });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/auth/register — inscription élèves
router.post('/register', authLimiter, [
  body('firstName').trim().notEmpty().isLength({ max: 50 }),
  body('lastName').trim().notEmpty().isLength({ max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6, max: 72 }),
  body('phone').optional().trim().isLength({ max: 20 }),
], validate, async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email déjà utilisé' });

    const user = await User.create({ firstName, lastName, email, password, phone, role: 'student' });
    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ accessToken, user });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ message: 'Refresh token manquant' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token || !user.isActive) {
      return res.status(401).json({ message: 'Session invalide' });
    }
    const { accessToken, refreshToken: newRefresh } = generateTokens(user._id);
    user.refreshToken = newRefresh;
    await user.save();
    setRefreshCookie(res, newRefresh);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ message: 'Refresh token invalide ou expiré' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.clearCookie('refreshToken');
  res.json({ message: 'Déconnecté' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/auth/change-password — prof change son mot de passe
router.patch('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6, max: 72 }),
], validate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    const valid = await user.comparePassword(req.body.currentPassword);
    if (!valid) return res.status(401).json({ message: 'Mot de passe actuel incorrect' });

    user.password = req.body.newPassword;
    // Conserve le nouveau mot de passe en clair pour l'admin
    if (req.user.role === 'teacher') user.plainPassword = req.body.newPassword;
    await user.save();
    res.json({ message: 'Mot de passe modifié' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
