import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { logout } from '../api';
import NotificationBell from '../components/NotificationBell';

const navItems = [
  { to: '/admin', label: 'Tableau de bord', end: true, icon: '📊' },
  { to: '/admin/courses', label: 'Cours', icon: '📚' },
  { to: '/admin/teachers', label: 'Professeurs', icon: '👨‍🏫' },
  { to: '/admin/students', label: 'Élèves', icon: '👨‍🎓' },
  { to: '/admin/rooms', label: 'Salles', icon: '🏫' },
  { to: '/admin/schedule', label: 'Emploi du temps', icon: '📅' },
  { to: '/admin/enrollments', label: 'Inscriptions', icon: '✅' },
  { to: '/admin/absences', label: 'Absences', icon: '🚫' },
  { to: '/admin/accounting', label: 'Comptabilité', icon: '💰' },
  { to: '/admin/statistics', label: 'Statistiques', icon: '📈' },
  { to: '/admin/notifications', label: 'Notifications', icon: '🔔' },
];

export default function AdminLayout() {
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
          <span>Eford</span> Admin
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
          <span style={{ fontSize: '.875rem', color: 'var(--gray-500)' }}>Administration</span>
          <NotificationBell />
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
