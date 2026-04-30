import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAbsences } from '../../api';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import Badge from '../../components/Badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminAbsences() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['absences', page, type, from, to],
    queryFn: () => getAbsences({ page, type: type || undefined, from: from || undefined, to: to || undefined }).then(r => r.data),
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Absences</h1>
        <p className="page-subtitle">{data?.total ?? 0} absences enregistrées</p>
      </div>

      <div className="filters-bar">
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-input" value={type} onChange={e => { setType(e.target.value); setPage(1); }} style={{ minWidth: 140 }}>
            <option value="">Tous</option>
            <option value="student">Élève</option>
            <option value="teacher">Professeur</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Du</label>
          <input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Au</label>
          <input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      <div className="card">
        {isLoading ? <Spinner page /> : data?.data?.length === 0 ? <EmptyState message="Aucune absence" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Personne</th><th>Cours</th><th>Date</th><th>Type</th><th>Raison</th><th>Notifié</th></tr></thead>
              <tbody>
                {data.data.map(a => (
                  <tr key={a._id}>
                    <td>{a.user?.firstName} {a.user?.lastName}</td>
                    <td>{a.course?.title}</td>
                    <td>{format(new Date(a.date), 'dd/MM/yyyy', { locale: fr })}</td>
                    <td><Badge variant={a.type === 'teacher' ? 'info' : 'warning'}>{a.type === 'teacher' ? 'Professeur' : 'Élève'}</Badge></td>
                    <td>{a.reason || '—'}</td>
                    <td><Badge variant={a.notified ? 'success' : 'gray'}>{a.notified ? 'Oui' : 'Non'}</Badge></td>
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
