# Eford — Plateforme de gestion scolaire

Plateforme web complète de gestion scolaire pour une école jusqu'à 500 élèves et 30 professeurs.

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18 + Vite, Zustand, React Query, Recharts |
| Backend | Node.js + Express |
| Base de données | MongoDB Atlas (Mongoose) |
| Stockage fichiers | Cloudflare R2 (compatible S3) |
| Emails | Nodemailer (Resend / Brevo) |
| Auth | JWT (access token 15min + refresh token httpOnly cookie 7j) |
| Hébergement frontend | Cloudflare Pages |
| Hébergement backend | Render (free tier) |

## Structure du dépôt

```
/
├── frontend/       # Application React (Vite) → Cloudflare Pages
└── backend/        # API Express → Render
```

## Installation locale

### Prérequis
- Node.js ≥ 18
- Un cluster MongoDB Atlas (free tier)
- Un bucket Cloudflare R2
- Un compte SMTP (Resend ou Brevo gratuit)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # Remplir les variables
npm run seed           # Créer le compte admin par défaut
npm run dev            # Démarrer en développement (nodemon)
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # Remplir VITE_API_URL
npm run dev            # http://localhost:5173
```

## Déploiement

### Render (Backend)
1. Créer un Web Service → pointer sur le dossier `backend/`
2. Start command : `node src/app.js`
3. Ajouter toutes les variables du fichier `backend/.env.example`
4. Configurer un cron job externe (ex: [cron-job.org](https://cron-job.org)) qui ping `https://mon-backend.onrender.com/health` toutes les **14 minutes** pour éviter le sleep du free tier

### Cloudflare Pages (Frontend)
1. Connecter le dépôt GitHub
2. Root directory : `frontend`
3. Build command : `npm run build`
4. Build output : `dist`
5. Variable d'environnement : `VITE_API_URL=https://mon-backend.onrender.com/api`

## Compte admin par défaut

Après avoir lancé le seed :

| Email | Mot de passe |
|-------|-------------|
| `admin@eford.fr` | `Admin1234!` |

**Changez ce mot de passe dès la première connexion.**

## Rôles

| Rôle | Accès | Création |
|------|-------|----------|
| `admin` | Toute la plateforme | Via seed ou par un autre admin |
| `teacher` | Ses cours, appel, devoirs | Créé par l'admin (email + mdp temp.) |
| `student` | Ses données personnelles | Auto-inscription publique |

## Fonctionnalités principales

- **Auth** : JWT access (15min) + refresh token httpOnly (7j), bcrypt saltrounds 12
- **Cours** : CRUD complet, inscription immédiate ou sur approbation admin
- **Emploi du temps** : Vue grille hebdomadaire, détection conflits salle/prof
- **Absences** : Signalement prof → notification élèves (in-app + email), appel par les profs
- **Devoirs** : Upload direct vers R2 (pas de transit par Render), download via presigned URL 1h
- **Comptabilité** : Suivi revenus/dépenses, graphique mensuel, export PDF
- **Statistiques** : Taux de présence, cours populaires, évolution inscriptions
- **PDF** : Attestation scolarité, liste élèves, emploi du temps, rapport comptable
- **Notifications** : Système in-app avec badge, broadcast admin, emails automatiques

## Sécurité

- Helmet.js + CORS strict (domaine Cloudflare Pages seulement en prod)
- Rate limiting : 10 tentatives/15min sur les routes auth
- Validation express-validator sur toutes les entrées
- Jamais de `password` ni `refreshToken` dans les réponses API
- Clés R2 jamais exposées côté frontend (presigned URLs uniquement)
- Index MongoDB sur les champs fréquents

## Variables d'environnement

Voir `backend/.env.example` et `frontend/.env.example`.
