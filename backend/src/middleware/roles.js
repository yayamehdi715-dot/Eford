const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès refusé : rôle insuffisant' });
  }
  next();
};

module.exports = authorize;
