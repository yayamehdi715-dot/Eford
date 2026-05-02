import { useState } from 'react';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { mutate: doLogout } = useMutation({
    mutationFn: logout,
    onSettled: () => { clearAuth(); navigate('/login'); },
  });

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="layout">
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={closeSidebar} />
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <span>School</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <div className="sidebar-section" key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={closeSidebar}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">{user?.firstName} {user?.lastName}</div>
          <button className="btn btn-secondary btn-sm w-full" onClick={() => doLogout()}>
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <button className="menu-toggle" onClick={() => setSidebarOpen(o => !o)} aria-label="Menu">☰</button>
            <span className="topbar-title">Espace enseignant</span>
          </div>
          <NotificationBell />
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  );
}
