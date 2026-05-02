require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const compression = require('compression');
const morgan     = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB  = require('./config/db');

const app = express();

// ---------------------------------------------------------------------------
// Synchronisation du compte admin depuis les variables d'environnement.
// Sur Render : modifier ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_USERNAME
// puis redéployer suffit pour mettre à jour les accès sans toucher la base.
// ---------------------------------------------------------------------------
const syncAdmin = async () => {
  try {
    const User    = require('./models/User');
    const email    = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    // Dérive le username depuis l'email si ADMIN_USERNAME n'est pas défini
    // ex: "admin@eford.fr" → "admin"
    const username = (process.env.ADMIN_USERNAME || (email ? email.split('@')[0] : 'admin')).toLowerCase();

    if (!email || !password) {
      console.warn('[syncAdmin] ADMIN_EMAIL ou ADMIN_PASSWORD absent — compte admin non synchronisé');
      return;
    }

    let admin = await User.findOne({ role: 'admin' });

    if (!admin) {
      await User.create({
        firstName: 'Admin',
        lastName:  'Eford',
        email,
        username,
        role:      'admin',
        isActive:  true,
        password,  // hashé automatiquement par le pre-save hook
      });
      console.log(`[syncAdmin] Compte admin créé — identifiant : ${username}`);
    } else {
      // Met à jour email, username et re-hash le mot de passe si les vars ont changé
      admin.email    = email;
      admin.username = username;
      admin.password = password; // le pre-save hook re-hash automatiquement
      await admin.save();
      console.log(`[syncAdmin] Compte admin mis à jour — identifiant : ${username}`);
    }
  } catch (err) {
    console.error('[syncAdmin] Erreur :', err.message);
  }
};

// Démarrage : connexion DB puis synchronisation admin
(async () => {
  await connectDB();
  await syncAdmin();
  scheduleAbsenceCleanup();
})();

// Supprime les absences de plus de 14 jours — tourne toutes les 24h
function scheduleAbsenceCleanup() {
  const run = async () => {
    try {
      const Absence = require('./models/Absence');
      const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const { deletedCount } = await Absence.deleteMany({ date: { $lt: cutoff } });
      if (deletedCount) console.log(`[cleanup] ${deletedCount} absence(s) supprimée(s) (> 14 jours)`);
    } catch (err) {
      console.error('[cleanup] Erreur :', err.message);
    }
  };
  // Premier passage 10 s après le démarrage, puis toutes les 24h
  setTimeout(run, 10_000);
  setInterval(run, 24 * 60 * 60 * 1000);
}

app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

const frontendUrl = (process.env.FRONTEND_URL || '').trim().replace(/^["']|["']$/g, '');

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  frontendUrl,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqué pour : ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/teacher',       require('./routes/teacher'));
app.use('/api/student',       require('./routes/student'));
app.use('/api/courses',       require('./routes/courses'));
app.use('/api/rooms',         require('./routes/rooms'));
app.use('/api/schedule',      require('./routes/schedule'));
app.use('/api/absences',      require('./routes/absences'));
app.use('/api/assignments',   require('./routes/assignments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/enrollments',   require('./routes/enrollments'));
app.use('/api/stats',         require('./routes/stats'));
app.use('/api/files',         require('./routes/files'));
app.use('/api/pdf',           require('./routes/pdf'));

// Route seed uniquement disponible hors production
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/seed', require('./routes/seed'));
}

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;

// 📁 Emplacement : Eford-main/backend/src/app.js
