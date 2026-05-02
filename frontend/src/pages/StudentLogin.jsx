import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { register } from '../api';
import useAuthStore from '../store/authStore';
import api from '../api/axios';

const SCHOOL_LEVELS = [
  'CP', 'CE1', 'CE2', 'CM1', 'CM2',
  '6ème', '5ème', '4ème', '3ème',
  'Seconde', 'Première', 'Terminale',
  'BTS 1', 'BTS 2', 'Autre',
];

const emptyForm = { firstName: '', lastName: '', username: '', password: '', schoolLevel: '', phone: '' };

export default function StudentLogin() {
  const [mode, setMode] = useState('login');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...emptyForm, loginUsername: '', loginPassword: '' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const { mutate, isPending } = useMutation({
    mutationFn: mode === 'login'
      ? () => api.post('/auth/student-login', { username: form.loginUsername, password: form.loginPassword })
      : () => register({
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          password: form.password,
          schoolLevel: form.schoolLevel,
          phone: form.phone || undefined,
        }),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      navigate('/student');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Identifiants incorrects');
    },
  });

  const handleSubmit = (e) => { e.preventDefault(); mutate(); };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <div className="login-logo">S</div>
          <h1 className="login-title">School</h1>
          <p className="login-subtitle">Espace élève</p>
        </div>

        <div className="card login-card">
          <div className="tab-bar">
            {[
              { key: 'login', label: 'Connexion' },
              { key: 'register', label: 'Inscription' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setMode(key)} className={`tab-btn${mode === key ? ' active' : ''}`}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'login' ? (
              <>
                <div className="form-group">
                  <label className="form-label">Identifiant</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.loginUsername}
                    onChange={set('loginUsername')}
                    required
                    autoComplete="username"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mot de passe</label>
                  <input
                    type="password"
                    className="form-input"
                    value={form.loginPassword}
                    onChange={set('loginPassword')}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nom *</label>
                    <input className="form-input" value={form.lastName} onChange={set('lastName')} required autoComplete="family-name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prénom *</label>
                    <input className="form-input" value={form.firstName} onChange={set('firstName')} required autoComplete="given-name" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Identifiant *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.username}
                    onChange={set('username')}
                    required
                    autoComplete="username"
                    placeholder="ex : dupont.marie"
                  />
                  <p className="form-hint">Lettres, chiffres, points, tirets uniquement. Vous l'utiliserez pour vous connecter.</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Mot de passe *</label>
                  <input
                    type="password"
                    className="form-input"
                    value={form.password}
                    onChange={set('password')}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Niveau scolaire *</label>
                  <select className="form-input" value={form.schoolLevel} onChange={set('schoolLevel')} required>
                    <option value="">Sélectionner...</option>
                    {SCHOOL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Téléphone <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optionnel)</span>
                  </label>
                  <input className="form-input" value={form.phone} onChange={set('phone')} autoComplete="tel" />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={isPending} style={{ marginTop: '.25rem' }}>
              {isPending ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>
        </div>

        <p className="login-hint">
          Vous êtes enseignant ou administrateur ?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>Accéder à l'espace staff</Link>
        </p>
      </div>
    </div>
  );
}
