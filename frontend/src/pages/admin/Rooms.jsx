import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getRooms, createRoom, updateRoom, deleteRoom } from '../../api';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Badge from '../../components/Badge';
import { useForm } from 'react-hook-form';

export default function AdminRooms() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: rooms, isLoading } = useQuery({ queryKey: ['rooms'], queryFn: () => getRooms().then(r => r.data) });
  const { register, handleSubmit, reset, setValue } = useForm();

  const openCreate = () => { reset(); setEditing({}); };
  const openEdit = (r) => {
    reset();
    setValue('name', r.name); setValue('capacity', r.capacity);
    setValue('equipment', r.equipment); setValue('isAvailable', r.isAvailable);
    setEditing(r);
  };

  const saveMut = useMutation({
    mutationFn: (d) => editing._id ? updateRoom(editing._id, d) : createRoom(d),
    onSuccess: () => { toast.success('Salle sauvegardée'); qc.invalidateQueries(['rooms']); setEditing(null); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => { toast.success('Salle supprimée'); qc.invalidateQueries(['rooms']); setDeleteTarget(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Salles</h1>
        <p className="page-subtitle">{rooms?.length ?? 0} salles enregistrées</p>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-primary" onClick={openCreate}>+ Nouvelle salle</button>
      </div>
      <div className="card">
        {isLoading ? <Spinner page /> : rooms?.length === 0 ? <EmptyState message="Aucune salle" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nom</th><th>Capacité</th><th>Équipements</th><th>Disponible</th><th>Actions</th></tr></thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r._id}>
                    <td><strong>{r.name}</strong></td>
                    <td>{r.capacity} places</td>
                    <td style={{ maxWidth: 200 }} className="truncate">{r.equipment || '—'}</td>
                    <td><Badge variant={r.isAvailable ? 'success' : 'danger'}>{r.isAvailable ? 'Oui' : 'Non'}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', gap: '.5rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>Modifier</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(r)}>Suppr.</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={!!editing} onClose={() => { setEditing(null); reset(); }}
        title={editing?._id ? 'Modifier la salle' : 'Nouvelle salle'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setEditing(null); reset(); }}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSubmit(d => saveMut.mutate(d))} disabled={saveMut.isPending}>
            {saveMut.isPending ? '...' : 'Sauvegarder'}
          </button>
        </>}
      >
        <form>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input className="form-input" {...register('name', { required: true })} />
            </div>
            <div className="form-group">
              <label className="form-label">Capacité *</label>
              <input type="number" min={1} className="form-input" {...register('capacity', { required: true, min: 1 })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Équipements</label>
            <textarea className="form-input" rows={2} {...register('equipment')} placeholder="Tableau, projecteur..." />
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.875rem', cursor: 'pointer' }}>
              <input type="checkbox" {...register('isAvailable')} defaultChecked />
              Disponible
            </label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget._id)}
        title="Supprimer la salle"
        message={`Supprimer la salle "${deleteTarget?.name}" ?`}
        confirmLabel="Supprimer" danger
      />
    </>
  );
}
