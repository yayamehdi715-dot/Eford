import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { login, register } from '../api';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const { mutate, isPending } = useMutation({
    mutationFn: mode === 'login' ? () => login({ email: form.email, password: form.password }) : () => register(form),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      const redirects = { admin: '/admin', teacher: '/teacher', student: '/student' };
      navigate(redirects[data.user.role] || '/');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erreur de connexion');
    },
  });

  const handleSubmit = (e) => { e.preventDefault(); mutate(); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--gray-900)' }}>
            <span style={{ color: 'var(--primary)' }}>Eford</span>
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '.875rem' }}>Plateforme de gestion scolaire</p>
        </div>
        <div className="card">
          <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', marginBottom: '1.5rem' }}>
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '.75rem', background: 'none', border: 'none',
                  fontWeight: 600, fontSize: '.875rem',
                  color: mode === m ? 'var(--primary)' : 'var(--gray-500)',
                  borderBottom: mode === m ? '2px solid var(--primary)' : '2px solid transparent',
                  transition: 'all .15s',
                }}
              >
                {m === 'login' ? 'Connexion' : 'Inscription élève'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Prénom</label>
                  <input className="form-input" value={form.firstName} onChange={set('firstName')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom</label>
                  <input className="form-input" value={form.lastName} onChange={set('lastName')} required />
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={form.email} onChange={set('email')} required autoComplete="email" />
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <input type="password" className="form-input" value={form.password} onChange={set('password')} required autoComplete="current-password" />
            </div>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Téléphone (optionnel)</label>
                <input className="form-input" value={form.phone} onChange={set('phone')} />
              </div>
            )}
            <button type="submit" className="btn btn-primary w-full" disabled={isPending} style={{ marginTop: '.5rem' }}>
              {isPending ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', fontSize: '.75rem', color: 'var(--gray-400)', marginTop: '1rem' }}>
          Les comptes enseignants sont créés par l'administrateur.
        </p>
      </div>
    </div>
  );
}
