import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';
import { logout } from '../api';
import NotificationBell from '../components/NotificationBell';

const navItems = [
  { to: '/student', label: 'Tableau de bord', end: true, icon: '📊' },
  { to: '/student/schedule', label: 'Emploi du temps', icon: '📅' },
  { to: '/student/courses', label: 'Catalogue cours', icon: '📚' },
  { to: '/student/enrollments', label: 'Mes inscriptions', icon: '✅' },
  { to: '/student/assignments', label: 'Devoirs & Cours', icon: '📝' },
  { to: '/student/absences', label: 'Mes absences', icon: '🚫' },
  { to: '/student/notifications', label: 'Notifications', icon: '🔔' },
];

export default function StudentLayout() {
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
          <span>Eford</span> Élève
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
          <span style={{ fontSize: '.875rem', color: 'var(--gray-500)' }}>Espace élève</span>
          <NotificationBell />
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  );
}
