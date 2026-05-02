import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { login } from '../api';
import useAuthStore from '../store/authStore';

export default function Login() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => login({ username: form.username, password: form.password }),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      const redirects = { admin: '/admin', teacher: '/teacher' };
      navigate(redirects[data.user.role] || '/admin');
    },
    onError: () => toast.error('Identifiants incorrects'),
  });

  const handleSubmit = (e) => { e.preventDefault(); mutate(); };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <div className="login-logo">S</div>
          <h1 className="login-title">School</h1>
          <p className="login-subtitle">Espace administration & enseignants</p>
        </div>

        <div className="card login-card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '1.25rem' }}>
            Connexion
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nom d'utilisateur</label>
              <input
                type="text"
                className="form-input"
                value={form.username}
                onChange={set('username')}
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
                value={form.password}
                onChange={set('password')}
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={isPending} style={{ marginTop: '.25rem' }}>
              {isPending ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="login-hint">
          Vous êtes élève ?{' '}
          <Link to="/student-login" style={{ fontWeight: 600 }}>
            Accéder à l'espace élève
          </Link>
        </p>
      </div>
    </div>
  );
}
