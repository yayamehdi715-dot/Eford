import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAbsences } from '../../api';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function StudentAbsences() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['absences-student', page],
    queryFn: () => getAbsences({ page }).then(r => r.data),
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Mes absences</h1>
        <p className="page-subtitle">{data?.total ?? 0} absence(s) enregistrée(s)</p>
      </div>

      <div className="card">
        {isLoading ? <Spinner page /> : data?.data?.length === 0
          ? <EmptyState message="Aucune absence enregistrée — continuez comme ça !" />
          : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Cours</th><th>Raison</th></tr></thead>
                <tbody>
                  {data.data.map(a => (
                    <tr key={a._id}>
                      <td>{format(new Date(a.date), 'EEEE dd MMMM yyyy', { locale: fr })}</td>
                      <td>{a.course?.title}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{a.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        <Pagination page={page} pages={data?.pages || 1} onChange={setPage} />
      </div>
    </>
  );
}
