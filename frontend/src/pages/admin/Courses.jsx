import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getCourses, createCourse, updateCourse, deleteCourse, getTeachers, getRooms,
  getAdminCourseStudents, adminAddStudent, adminRemoveStudent, getStudents,
} from '../../api';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import Badge from '../../components/Badge';
import { useForm } from 'react-hook-form';

export default function AdminCourses() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [manageStudentsCourse, setManageStudentsCourse] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['courses', page, search], queryFn: () => getCourses({ page, search }).then(r => r.data) });
  const { data: teachersData } = useQuery({ queryKey: ['teachers-list'], queryFn: () => getTeachers({ limit: 100 }).then(r => r.data) });
  const { data: roomsData } = useQuery({ queryKey: ['rooms'], queryFn: () => getRooms().then(r => r.data) });

  // Students in selected course
  const { data: courseStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['course-students-admin', manageStudentsCourse?._id],
    queryFn: () => getAdminCourseStudents(manageStudentsCourse._id).then(r => r.data),
    enabled: !!manageStudentsCourse,
  });

  // All students (for picker)
  const { data: allStudentsData } = useQuery({
    queryKey: ['students-list', studentSearch],
    queryFn: () => getStudents({ search: studentSearch, limit: 20 }).then(r => r.data),
    enabled: !!manageStudentsCourse,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const openCreate = () => { reset(); setEditing({}); };
  const openEdit = (c) => {
    reset();
    setValue('title', c.title); setValue('description', c.description);
    setValue('teacher', c.teacher?._id || c.teacher);
    setValue('room', c.room?._id || c.room);
    setValue('maxStudents', c.maxStudents);
    setValue('requiresApproval', c.requiresApproval);
    setEditing(c);
  };

  const saveMut = useMutation({
    mutationFn: (d) => editing._id ? updateCourse(editing._id, d) : createCourse(d),
    onSuccess: () => { toast.success(editing._id ? 'Cours mis à jour' : 'Cours créé'); qc.invalidateQueries(['courses']); setEditing(null); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => { toast.success('Supprimé'); qc.invalidateQueries(['courses']); setDeleteTarget(null); },
  });

  const addStudentMut = useMutation({
    mutationFn: ({ studentId }) => adminAddStudent(manageStudentsCourse._id, studentId),
    onSuccess: () => { toast.success('Élève ajouté'); qc.invalidateQueries(['course-students-admin', manageStudentsCourse._id]); qc.invalidateQueries(['courses']); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const removeStudentMut = useMutation({
    mutationFn: (studentId) => adminRemoveStudent(manageStudentsCourse._id, studentId),
    onSuccess: () => { toast.success('Élève retiré'); qc.invalidateQueries(['course-students-admin', manageStudentsCourse._id]); qc.invalidateQueries(['courses']); },
    onError: () => toast.error('Erreur'),
  });

  const enrolledIds = new Set((courseStudents || []).map(s => s._id));
  const teachers = teachersData?.data || [];
  const rooms = roomsData || [];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Cours</h1>
        <p className="page-subtitle">{data?.total ?? 0} cours enregistrés</p>
      </div>

      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem' }}>
        <input className="form-input" placeholder="Rechercher..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ maxWidth: 280 }} />
        <button className="btn btn-primary" onClick={openCreate}>+ Nouveau cours</button>
      </div>

      <div className="card">
        {isLoading ? <Spinner page /> : data?.data?.length === 0 ? <EmptyState message="Aucun cours" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Titre</th><th>Professeur</th><th>Salle</th><th>Places</th><th>Approbation</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {(data?.data || []).map(c => (
                  <tr key={c._id}>
                    <td><strong>{c.title}</strong></td>
                    <td>{c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : '—'}</td>
                    <td>{c.room?.name || '—'}</td>
                    <td>{c.enrolledCount}/{c.maxStudents}</td>
                    <td><Badge variant={c.requiresApproval ? 'warning' : 'success'}>{c.requiresApproval ? 'Requise' : 'Auto'}</Badge></td>
                    <td><Badge variant={c.isActive ? 'success' : 'danger'}>{c.isActive ? 'Actif' : 'Inactif'}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setManageStudentsCourse(c); setStudentSearch(''); }}>Élèves</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Modifier</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(c)}>Suppr.</button>
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

      {/* Modal gestion des élèves */}
      <Modal
        isOpen={!!manageStudentsCourse}
        onClose={() => setManageStudentsCourse(null)}
        title={`Élèves — ${manageStudentsCourse?.title}`}
        footer={<button className="btn btn-secondary" onClick={() => setManageStudentsCourse(null)}>Fermer</button>}
      >
        <div>
          <p style={{ fontSize: '.8rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>
            {(courseStudents || []).length} élève(s) inscrit(s)
          </p>

          {/* Liste des élèves inscrits */}
          {studentsLoading ? <Spinner /> : (courseStudents || []).length === 0
            ? <p style={{ fontSize: '.875rem', color: 'var(--gray-400)', marginBottom: '1rem' }}>Aucun élève inscrit</p>
            : (
              <div style={{ marginBottom: '1.25rem' }}>
                {courseStudents.map(s => (
                  <div key={s._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.5rem .625rem', borderRadius: 6, border: '1px solid var(--gray-200)', marginBottom: '.375rem' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '.875rem' }}>{s.firstName} {s.lastName}</span>
                      <span style={{ fontSize: '.75rem', color: 'var(--gray-400)', marginLeft: '.5rem' }}>{s.username}</span>
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeStudentMut.mutate(s._id)}
                      disabled={removeStudentMut.isPending}
                    >
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            )
          }

          {/* Ajouter un élève */}
          <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1rem' }}>
            <label className="form-label">Ajouter un élève</label>
            <input
              className="form-input"
              placeholder="Rechercher un élève..."
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              style={{ marginBottom: '.625rem' }}
            />
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {(allStudentsData?.data || [])
                .filter(s => !enrolledIds.has(s._id))
                .map(s => (
                  <div key={s._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.4rem .625rem', borderRadius: 6, border: '1px solid var(--gray-200)', marginBottom: '.25rem' }}>
                    <div>
                      <span style={{ fontWeight: 500, fontSize: '.875rem' }}>{s.firstName} {s.lastName}</span>
                      <span style={{ fontSize: '.75rem', color: 'var(--gray-400)', marginLeft: '.5rem' }}>{s.username}</span>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => addStudentMut.mutate({ studentId: s._id })}
                      disabled={addStudentMut.isPending}
                    >
                      Inscrire
                    </button>
                  </div>
                ))
              }
              {(allStudentsData?.data || []).filter(s => !enrolledIds.has(s._id)).length === 0 && studentSearch && (
                <p style={{ fontSize: '.8rem', color: 'var(--gray-400)', padding: '.5rem' }}>Aucun élève trouvé</p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal création/édition */}
      <Modal isOpen={!!editing} onClose={() => { setEditing(null); reset(); }}
        title={editing?._id ? 'Modifier le cours' : 'Nouveau cours'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setEditing(null); reset(); }}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSubmit(d => saveMut.mutate(d))} disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </>}
      >
        <form>
          <div className="form-group">
            <label className="form-label">Titre *</label>
            <input className="form-input" {...register('title', { required: true })} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} {...register('description')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <div className="form-group">
              <label className="form-label">Professeur *</label>
              <select className="form-input" {...register('teacher', { required: true })}>
                <option value="">Choisir...</option>
                {teachers.map(t => <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Salle</label>
              <select className="form-input" {...register('room')}>
                <option value="">Aucune</option>
                {rooms.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <div className="form-group">
              <label className="form-label">Places max *</label>
              <input type="number" min={1} max={500} className="form-input" {...register('maxStudents', { required: true, min: 1 })} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.875rem', cursor: 'pointer' }}>
                <input type="checkbox" {...register('requiresApproval')} />
                Approbation requise
              </label>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget._id)}
        title="Supprimer le cours"
        message={`Supprimer le cours "${deleteTarget?.title}" ?`}
        confirmLabel="Supprimer" danger
      />
    </>
  );
}
