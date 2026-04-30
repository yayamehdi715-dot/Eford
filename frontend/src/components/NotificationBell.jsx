import { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn btn-secondary btn-icon"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        <div className="notif-badge">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && <span className="count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </div>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: '110%', width: 340,
            background: 'white', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)',
            boxShadow: 'var(--shadow-md)', zIndex: 100, overflow: 'hidden'
          }}>
            <div style={{ padding: '.75rem 1rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '.875rem' }}>Notifications</span>
              {unreadCount > 0 && (
                <button onClick={() => markAllRead()} style={{ fontSize: '.75rem', color: 'var(--primary)', background: 'none', border: 'none' }}>
                  Tout lire
                </button>
              )}
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--gray-400)', fontSize: '.875rem' }}>
                  Aucune notification
                </p>
              ) : notifications.map(n => (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && markRead(n._id)}
                  style={{
                    padding: '.75rem 1rem',
                    borderBottom: '1px solid var(--gray-50)',
                    background: n.isRead ? 'white' : 'var(--primary-light)',
                    cursor: n.isRead ? 'default' : 'pointer',
                  }}
                >
                  <p style={{ fontSize: '.8rem', fontWeight: n.isRead ? 400 : 600, color: 'var(--gray-800)' }}>{n.title}</p>
                  <p style={{ fontSize: '.75rem', color: 'var(--gray-500)', marginTop: '.2rem' }}>{n.message}</p>
                  <p style={{ fontSize: '.7rem', color: 'var(--gray-400)', marginTop: '.25rem' }}>
                    {format(new Date(n.createdAt), 'dd MMM à HH:mm', { locale: fr })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
