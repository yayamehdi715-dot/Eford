import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getEnrollments, approveEnrollment, rejectEnrollment } from '../../api';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { StatusBadge } from '../../components/Badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminEnrollments() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');

  const { data, isLoading } = useQuery({
    queryKey: ['enrollments', page, status],
    queryFn: () => getEnrollments({ page, status: status || undefined }).then(r => r.data),
  });

  const approveMut = useMutation({
    mutationFn: approveEnrollment,
    onSuccess: () => { toast.success('Inscription approuvée'); qc.invalidateQueries(['enrollments']); },
    onError: () => toast.error('Erreur'),
  });

  const rejectMut = useMutation({
    mutationFn: rejectEnrollment,
    onSuccess: () => { toast.success('Inscription refusée'); qc.invalidateQueries(['enrollments']); },
    onError: () => toast.error('Erreur'),
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Inscriptions</h1>
        <p className="page-subtitle">{data?.total ?? 0} inscriptions</p>
      </div>

      <div className="filters-bar" style={{ marginBottom: '1rem' }}>
        {['pending', 'approved', 'rejected', ''].map(s => (
          <button
            key={s || 'all'}
            className={`btn ${status === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => { setStatus(s); setPage(1); }}
          >
            {s === 'pending' ? 'En attente' : s === 'approved' ? 'Approuvées' : s === 'rejected' ? 'Refusées' : 'Toutes'}
          </button>
        ))}
      </div>

      <div className="card">
        {isLoading ? <Spinner page /> : data?.data?.length === 0 ? <EmptyState message="Aucune inscription" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Élève</th><th>Cours</th><th>Date demande</th><th>Statut</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {data.data.map(e => (
                  <tr key={e._id}>
                    <td><strong>{e.student?.firstName} {e.student?.lastName}</strong><br /><span className="text-xs" style={{ color: 'var(--gray-500)' }}>{e.student?.email}</span></td>
                    <td>{e.course?.title}</td>
                    <td>{format(new Date(e.enrolledAt), 'dd MMM yyyy', { locale: fr })}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td>
                      {e.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '.5rem' }}>
                          <button className="btn btn-success btn-sm" onClick={() => approveMut.mutate(e._id)} disabled={approveMut.isPending}>
                            Approuver
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => rejectMut.mutate(e._id)} disabled={rejectMut.isPending}>
                            Refuser
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={data?.pages || 1} onChange={setPage} />
      </div>
    </>
  );
}
