import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';
import { logout } from '../api';
import NotificationBell from '../components/NotificationBell';

const navItems = [
  { to: '/teacher', label: 'Tableau de bord', end: true, icon: '📊' },
  { to: '/teacher/classes', label: 'Mes classes', icon: '👥' },
  { to: '/teacher/schedule', label: 'Emploi du temps', icon: '📅' },
  { to: '/teacher/attendance', label: 'Appel', icon: '✅' },
  { to: '/teacher/assignments', label: 'Devoirs & Cours', icon: '📝' },
  { to: '/teacher/absence', label: 'Signaler absence', icon: '🚫' },
];

export default function TeacherLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const { mutate: doLogout } = useMutation({
    mutationFn: logout,
    onSettled: () => { clearAuth(); navigate('/login'); },
  });

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>Eford</span> Prof
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <div className="sidebar-section" key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontSize: '.8rem', color: 'var(--gray-400)', marginBottom: '.5rem' }}>
            {user?.firstName} {user?.lastName}
          </div>
          <button className="btn btn-secondary btn-sm w-full" onClick={() => doLogout()}>
            Déconnexion
          </button>
        </div>
      </aside>
      <div className="main-content">
        <header className="topbar">
          <span style={{ fontSize: '.875rem', color: 'var(--gray-500)' }}>Espace enseignant</span>
          <NotificationBell />
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  );
}
