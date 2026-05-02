import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getTeachers, createTeacher, toggleUser, deleteUser } from '../../api';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import Badge from '../../components/Badge';
import { useForm } from 'react-hook-form';

export default function AdminTeachers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', page, search],
    queryFn: () => getTeachers({ page, search }).then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const createMut = useMutation({
    mutationFn: createTeacher,
    onSuccess: () => { toast.success('Professeur créé'); qc.invalidateQueries(['teachers']); setShowCreate(false); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const toggleMut = useMutation({
    mutationFn: toggleUser,
    onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries(['teachers']); },
    onError: () => toast.error('Erreur'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => { toast.success('Supprimé'); qc.invalidateQueries(['teachers']); setDeleteTarget(null); },
    onError: () => toast.error('Erreur'),
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Professeurs</h1>
        <p className="page-subtitle">{data?.total ?? 0} professeurs enregistrés</p>
      </div>

      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem' }}>
        <input
          className="form-input" placeholder="Rechercher..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ maxWidth: 280 }}
        />
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Nouveau professeur</button>
      </div>

      <div className="card">
        {isLoading ? <Spinner page /> : data?.data?.length === 0 ? <EmptyState message="Aucun professeur trouvé" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom</th><th>Identifiant</th><th>Mot de passe</th><th>Téléphone</th><th>Statut</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.data || []).map(t => (
                  <tr key={t._id}>
                    <td><strong>{t.firstName} {t.lastName}</strong></td>
                    <td><code style={{ fontSize: '.8rem', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>{t.username || '—'}</code></td>
                    <td>
                      {t.plainPassword
                        ? <code style={{ fontSize: '.8rem', background: 'var(--warning-light)', color: 'var(--warning)', padding: '2px 6px', borderRadius: 4 }}>{t.plainPassword}</code>
                        : <span style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>—</span>
                      }
                    </td>
                    <td>{t.phone || '—'}</td>
                    <td><Badge variant={t.isActive ? 'success' : 'danger'}>{t.isActive ? 'Actif' : 'Inactif'}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', gap: '.5rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => toggleMut.mutate(t._id)}>
                          {t.isActive ? 'Désactiver' : 'Activer'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(t)}>Suppr.</button>
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

      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Nouveau professeur"
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setShowCreate(false); reset(); }}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSubmit(d => createMut.mutate(d))} disabled={createMut.isPending}>
            {createMut.isPending ? 'Création...' : 'Créer'}
          </button>
        </>}
      >
        <form>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <div className="form-group">
              <label className="form-label">Prénom *</label>
              <input className={`form-input${errors.firstName ? ' error' : ''}`} {...register('firstName', { required: true })} />
            </div>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input className={`form-input${errors.lastName ? ' error' : ''}`} {...register('lastName', { required: true })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Identifiant (username) *</label>
            <input
              className={`form-input${errors.username ? ' error' : ''}`}
              {...register('username', { required: true })}
              placeholder="ex : dupont.jean"
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe initial *</label>
            <input
              type="password"
              className={`form-input${errors.password ? ' error' : ''}`}
              {...register('password', { required: true, minLength: 8 })}
              autoComplete="new-password"
            />
            {errors.password?.type === 'minLength' && <p className="form-error">8 caractères minimum</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Téléphone</label>
            <input className="form-input" {...register('phone')} />
          </div>
          <p className="form-hint">Le professeur pourra modifier son mot de passe dans son profil. L'ancien mot de passe reste visible ici.</p>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget._id)}
        title="Supprimer le professeur"
        message={`Supprimer ${deleteTarget?.firstName} ${deleteTarget?.lastName} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
      />
    </>
  );
}
