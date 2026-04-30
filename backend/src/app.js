require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const connectDB = require('./config/db');

const app = express();

// Connexion base de données
connectDB();

// Sécurité headers HTTP
app.use(helmet());

// Compression gzip
app.use(compression());

// Logger en développement
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// CORS strict : autoriser uniquement le frontend Cloudflare Pages
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parsers JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/absences', require('./routes/absences'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/enrollments', require('./routes/enrollments'));
app.use('/api/accounting', require('./routes/accounting'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/files', require('./routes/files'));
app.use('/api/pdf', require('./routes/pdf'));

// Health check pour le cron job externe (évite le sleep sur Render free tier)
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Gestion des routes non trouvées
app.use((req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// Gestion globale des erreurs
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
