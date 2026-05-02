import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { register } from '../api';
import useAuthStore from '../store/authStore';
import api from '../api/axios';

export default function StudentLogin() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const { mutate, isPending } = useMutation({
    mutationFn: mode === 'login'
      ? () => api.post('/auth/student-login', { email: form.email, password: form.password })
      : () => register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, phone: form.phone }),
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
            {mode === 'register' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Prénom</label>
                    <input className="form-input" value={form.firstName} onChange={set('firstName')} required autoComplete="given-name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nom</label>
                    <input className="form-input" value={form.lastName} onChange={set('lastName')} required autoComplete="family-name" />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={set('email')}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <input
                type="password"
                className="form-input"
                value={form.password}
                onChange={set('password')}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">
                  Téléphone <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optionnel)</span>
                </label>
                <input className="form-input" value={form.phone} onChange={set('phone')} autoComplete="tel" />
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={isPending} style={{ marginTop: '.25rem' }}>
              {isPending ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>
        </div>

        <p className="login-hint">
          Vous êtes enseignant ou administrateur ?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Accéder à l'espace staff
          </Link>
        </p>
      </div>
    </div>
  );
}
