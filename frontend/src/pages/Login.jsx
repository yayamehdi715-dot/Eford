import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { login, register } from '../api';
import useAuthStore from '../store/authStore';
import api from '../api/axios';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({ firstName: '', lastName: '', identifier: '', email: '', password: '', phone: '' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleLogin = async () => {
    // Try staff login first, then student login
    try {
      const res = await login({ username: form.identifier, password: form.password });
      return res;
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 422) {
        // Try student login with email
        return api.post('/auth/student-login', { email: form.identifier, password: form.password });
      }
      throw err;
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: mode === 'login'
      ? handleLogin
      : () => register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, phone: form.phone }),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      const redirects = { admin: '/admin', teacher: '/teacher', student: '/student' };
      navigate(redirects[data.user.role] || '/');
    },
    onError: () => {
      toast.error('Identifiants incorrects');
    },
  });

  const handleSubmit = (e) => { e.preventDefault(); mutate(); };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <div className="login-logo">S</div>
          <h1 className="login-title">School</h1>
          <p className="login-subtitle">Plateforme de gestion scolaire</p>
        </div>

        <div className="card login-card">
          <div className="tab-bar">
            {[
              { key: 'login', label: 'Connexion' },
              { key: 'register', label: 'Inscription élève' },
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
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={form.email} onChange={set('email')} required autoComplete="email" />
                </div>
              </>
            )}

            {mode === 'login' && (
              <div className="form-group">
                <label className="form-label">Identifiant</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.identifier}
                  onChange={set('identifier')}
                  required
                  autoComplete="username"
                  placeholder="Nom d'utilisateur ou email"
                />
                <p className="form-hint">Élèves : utilisez votre email. Enseignants/admin : votre nom d'utilisateur.</p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <input type="password" className="form-input" value={form.password} onChange={set('password')} required autoComplete="current-password" />
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
      </div>
    </div>
  );
}
