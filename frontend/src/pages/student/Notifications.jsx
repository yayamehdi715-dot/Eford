import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markRead, markAllRead } from '../../api';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import Badge from '../../components/Badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const typeColors = { absence: 'danger', assignment: 'info', enrollment: 'success', general: 'gray' };
const typeLabels = { absence: 'Absence', assignment: 'Devoir', enrollment: 'Inscription', general: 'Général' };

export default function StudentNotifications() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-page', page],
    queryFn: () => getNotifications({ page }).then(r => r.data),
  });

  const readMut = useMutation({
    mutationFn: markRead,
    onSuccess: () => qc.invalidateQueries(['notifications-page', page]),
  });

  const readAllMut = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => qc.invalidateQueries(['notifications-page']),
  });

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Mes notifications</h1>
          <p className="page-subtitle">{data?.unreadCount ?? 0} non lue(s)</p>
        </div>
        {data?.unreadCount > 0 && (
          <button className="btn btn-secondary" onClick={() => readAllMut.mutate()}>Tout marquer comme lu</button>
        )}
      </div>

      <div className="card">
        {isLoading ? <Spinner page /> : data?.data?.length === 0 ? <EmptyState message="Aucune notification" /> : (
          <>
            {data.data.map(n => (
              <div
                key={n._id}
                onClick={() => !n.isRead && readMut.mutate(n._id)}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid var(--gray-100)',
                  background: n.isRead ? 'white' : 'var(--primary-light)',
                  cursor: n.isRead ? 'default' : 'pointer',
                  borderRadius: 'var(--radius)',
                  marginBottom: 2,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.25rem' }}>
                  <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                    {!n.isRead && <span style={{ width: 8, height: 8, background: 'var(--primary)', borderRadius: '50%', display: 'inline-block' }} />}
                    <strong style={{ fontSize: '.875rem' }}>{n.title}</strong>
                    <Badge variant={typeColors[n.type] || 'gray'}>{typeLabels[n.type] || n.type}</Badge>
                  </div>
                  <span style={{ fontSize: '.75rem', color: 'var(--gray-400)' }}>
                    {format(new Date(n.createdAt), 'dd MMM à HH:mm', { locale: fr })}
                  </span>
                </div>
                <p style={{ fontSize: '.875rem', color: 'var(--gray-600)' }}>{n.message}</p>
              </div>
            ))}
          </>
        )}
        <Pagination page={page} pages={data?.pages || 1} onChange={setPage} />
      </div>
    </>
  );
}
