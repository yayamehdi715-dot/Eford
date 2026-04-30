import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getCourses, enroll } from '../../api';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import Badge from '../../components/Badge';

export default function StudentCourses() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['courses-catalog', page, search],
    queryFn: () => getCourses({ page, search }).then(r => r.data),
  });

  const enrollMut = useMutation({
    mutationFn: enroll,
    onSuccess: ({ data: res }) => {
      toast.success(res.message);
      qc.invalidateQueries(['my-enrollments']);
      qc.invalidateQueries(['courses-catalog']);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Catalogue des cours</h1>
        <p className="page-subtitle">Inscrivez-vous aux cours disponibles</p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input className="form-input" placeholder="Rechercher un cours..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ maxWidth: 300 }} />
      </div>

      {isLoading ? <Spinner page /> : data?.data?.length === 0 ? <EmptyState message="Aucun cours disponible" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {data.data.map(c => {
            const full = c.enrolledCount >= c.maxStudents;
            return (
              <div key={c._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.5rem' }}>
                  <h3 style={{ fontWeight: 600, flex: 1 }}>{c.title}</h3>
                  <Badge variant={c.requiresApproval ? 'warning' : 'success'}>
                    {c.requiresApproval ? 'Sur approbation' : 'Libre'}
                  </Badge>
                </div>
                <p style={{ fontSize: '.8rem', color: 'var(--gray-500)', marginBottom: '.75rem', minHeight: 36 }}>
                  {c.description || 'Aucune description'}
                </p>
                <div style={{ fontSize: '.8rem', color: 'var(--gray-600)', marginBottom: '.75rem' }}>
                  <p>👨‍🏫 {c.teacher?.firstName} {c.teacher?.lastName}</p>
                  <p>🏫 {c.room?.name || 'Salle non assignée'}</p>
                  <p>👥 {c.enrolledCount}/{c.maxStudents} places</p>
                </div>
                <button
                  className={`btn ${full ? 'btn-secondary' : 'btn-primary'} w-full`}
                  disabled={full || enrollMut.isPending}
                  onClick={() => enrollMut.mutate(c._id)}
                >
                  {full ? 'Complet' : "S'inscrire"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} pages={data?.pages || 1} onChange={setPage} />
    </>
  );
}
