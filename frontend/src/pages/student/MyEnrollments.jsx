import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getMyEnrollments, unenroll } from '../../api';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { StatusBadge } from '../../components/Badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';

export default function StudentMyEnrollments() {
  const qc = useQueryClient();
  const [unenrollTarget, setUnenrollTarget] = useState(null);

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => getMyEnrollments().then(r => r.data),
  });

  const unenrollMut = useMutation({
    mutationFn: (courseId) => unenroll(courseId),
    onSuccess: () => { toast.success('Désinscrit'); qc.invalidateQueries(['my-enrollments']); setUnenrollTarget(null); },
    onError: () => toast.error('Erreur'),
  });

  if (isLoading) return <Spinner page />;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Mes inscriptions</h1>
        <p className="page-subtitle">{enrollments?.length ?? 0} inscription(s)</p>
      </div>

      {enrollments?.length === 0
        ? <EmptyState message="Vous n'êtes inscrit à aucun cours" action={<a href="/student/courses" className="btn btn-primary">Voir le catalogue</a>} />
        : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Cours</th><th>Professeur</th><th>Date d'inscription</th><th>Statut</th><th></th></tr></thead>
                <tbody>
                  {enrollments.map(e => (
                    <tr key={e._id}>
                      <td><strong>{e.course?.title}</strong></td>
                      <td>{e.course?.teacher ? `${e.course.teacher.firstName} ${e.course.teacher.lastName}` : '—'}</td>
                      <td>{format(new Date(e.enrolledAt), 'dd MMM yyyy', { locale: fr })}</td>
                      <td><StatusBadge status={e.status} /></td>
                      <td>
                        {e.status === 'pending' && (
                          <button className="btn btn-danger btn-sm" onClick={() => setUnenrollTarget(e)}>
                            Annuler
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      <ConfirmDialog
        isOpen={!!unenrollTarget}
        onClose={() => setUnenrollTarget(null)}
        onConfirm={() => unenrollMut.mutate(unenrollTarget.course._id)}
        title="Annuler l'inscription"
        message={`Annuler votre demande pour "${unenrollTarget?.course?.title}" ?`}
        confirmLabel="Confirmer" danger
      />
    </>
  );
}
