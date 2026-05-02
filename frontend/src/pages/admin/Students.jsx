import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getStudents, toggleUser, deleteUser, downloadAttestation } from '../../api';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import Badge from '../../components/Badge';
import { downloadBlob } from '../../utils/downloadBlob';

export default function AdminStudents() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, search],
    queryFn: () => getStudents({ page, search }).then(r => r.data),
  });

  const toggleMut = useMutation({
    mutationFn: toggleUser,
    onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries(['students']); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => { toast.success('Supprimé'); qc.invalidateQueries(['students']); setDeleteTarget(null); },
  });

  const handleAttestation = async (id, name) => {
    try {
      const { data: blob } = await downloadAttestation(id);
      downloadBlob(blob, `attestation-${name}.pdf`);
    } catch { toast.error('Erreur génération PDF'); }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Élèves</h1>
        <p className="page-subtitle">{data?.total ?? 0} élèves enregistrés</p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input className="form-input" placeholder="Rechercher..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ maxWidth: 280 }} />
      </div>

      <div className="card">
        {isLoading ? <Spinner page /> : data?.data?.length === 0 ? <EmptyState message="Aucun élève trouvé" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Statut</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {(data?.data || []).map(s => (
                  <tr key={s._id}>
                    <td><strong>{s.firstName} {s.lastName}</strong></td>
                    <td>{s.email}</td>
                    <td>{s.phone || '—'}</td>
                    <td><Badge variant={s.isActive ? 'success' : 'danger'}>{s.isActive ? 'Actif' : 'Inactif'}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => toggleMut.mutate(s._id)}>
                          {s.isActive ? 'Désactiver' : 'Activer'}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleAttestation(s._id, s.lastName)}>
                          Attestation
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(s)}>Suppr.</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={data?.pages || 1} onChange={setPage} />
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget._id)}
        title="Supprimer l'élève"
        message={`Supprimer ${deleteTarget?.firstName} ${deleteTarget?.lastName} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
      />
    </>
  );
}
