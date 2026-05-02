import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAssignments, getDownloadUrl } from '../../api';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function StudentAssignments() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['assignments-student', page],
    queryFn: () => getAssignments({ page }).then(r => r.data),
  });

  const downloadMut = useMutation({
    mutationFn: getDownloadUrl,
    onSuccess: ({ data }) => {
      // Ouvre l'URL presignée dans un nouvel onglet
      window.open(data.url, '_blank');
    },
    onError: () => toast.error('Erreur de téléchargement'),
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Devoirs & Documents</h1>
        <p className="page-subtitle">Documents publiés par vos professeurs</p>
      </div>

      <div className="card">
        {isLoading ? <Spinner page /> : data?.data?.length === 0 ? <EmptyState message="Aucun devoir disponible" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Titre</th><th>Cours</th><th>Professeur</th><th>Date limite</th><th>Fichier</th></tr></thead>
              <tbody>
                {(data?.data || []).map(a => (
                  <tr key={a._id}>
                    <td>
                      <strong>{a.title}</strong>
                      {a.description && <p style={{ fontSize: '.75rem', color: 'var(--gray-500)', marginTop: '.2rem' }}>{a.description}</p>}
                    </td>
                    <td>{a.course?.title}</td>
                    <td>{a.teacher?.firstName} {a.teacher?.lastName}</td>
                    <td>
                      {a.dueDate
                        ? <span style={{ color: new Date(a.dueDate) < new Date() ? 'var(--danger)' : 'inherit' }}>
                            {format(new Date(a.dueDate), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        : '—'
                      }
                    </td>
                    <td>
                      {a.fileName ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => downloadMut.mutate(a._id)}
                          disabled={downloadMut.isPending}
                        >
                          📎 Télécharger
                        </button>
                      ) : '—'}
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
