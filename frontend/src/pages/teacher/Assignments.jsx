import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAssignments, createAssignment, deleteAssignment, getMyCourses, getUploadUrl } from '../../api';
import { uploadToR2 } from '../../utils/downloadBlob';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Mo

export default function TeacherAssignments() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileRef = useRef();

  const { data, isLoading } = useQuery({
    queryKey: ['assignments-teacher', page],
    queryFn: () => getAssignments({ page }).then(r => r.data),
  });

  const { data: courses } = useQuery({ queryKey: ['my-courses'], queryFn: () => getMyCourses().then(r => r.data) });

  const { register, handleSubmit, reset } = useForm();

  const createMut = useMutation({
    mutationFn: async (formData) => {
      const { title, description, courseId, dueDate } = formData;
      let fileKey, fileName, fileSize;

      const file = fileRef.current?.files?.[0];
      if (file) {
        if (file.size > MAX_FILE_SIZE) throw new Error('Fichier trop lourd (max 50 Mo)');
        setUploadProgress('Préparation upload...');
        const { data: urlData } = await getUploadUrl({ fileName: file.name, contentType: file.type, fileSize: file.size });
        setUploadProgress('Upload en cours...');
        await uploadToR2(urlData.uploadUrl, file);
        fileKey = urlData.key;
        fileName = file.name;
        fileSize = file.size;
        setUploadProgress(null);
      }

      return createAssignment({ title, description, courseId, dueDate, fileKey, fileName, fileSize });
    },
    onSuccess: () => {
      toast.success('Devoir publié, élèves notifiés');
      qc.invalidateQueries(['assignments-teacher']);
      setShowCreate(false);
      reset();
      setUploadProgress(null);
    },
    onError: (e) => { toast.error(e.message || 'Erreur'); setUploadProgress(null); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => { toast.success('Supprimé'); qc.invalidateQueries(['assignments-teacher']); setDeleteTarget(null); },
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Devoirs & Documents</h1>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Publier un devoir</button>
      </div>
      <div className="card">
        {isLoading ? <Spinner page /> : data?.data?.length === 0 ? <EmptyState message="Aucun devoir publié" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Titre</th><th>Cours</th><th>Fichier</th><th>Date limite</th><th>Publié le</th><th></th></tr></thead>
              <tbody>
                {(data?.data || []).map(a => (
                  <tr key={a._id}>
                    <td><strong>{a.title}</strong><br /><span className="text-xs" style={{ color: 'var(--gray-500)' }}>{a.description}</span></td>
                    <td>{a.course?.title}</td>
                    <td>{a.fileName ? <span style={{ color: 'var(--primary)', fontSize: '.8rem' }}>📎 {a.fileName}</span> : '—'}</td>
                    <td>{a.dueDate ? format(new Date(a.dueDate), 'dd/MM/yyyy', { locale: fr }) : '—'}</td>
                    <td>{format(new Date(a.createdAt), 'dd/MM/yyyy', { locale: fr })}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(a)}>Suppr.</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={data?.pages || 1} onChange={setPage} />
      </div>

      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Publier un devoir"
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setShowCreate(false); reset(); }}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSubmit(d => createMut.mutate(d))} disabled={createMut.isPending}>
            {uploadProgress || (createMut.isPending ? 'Publication...' : 'Publier')}
          </button>
        </>}
      >
        <form>
          <div className="form-group">
            <label className="form-label">Cours *</label>
            <select className="form-input" {...register('courseId', { required: true })}>
              <option value="">Choisir...</option>
              {courses?.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Titre *</label>
            <input className="form-input" {...register('title', { required: true })} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} {...register('description')} />
          </div>
          <div className="form-group">
            <label className="form-label">Date limite</label>
            <input type="date" className="form-input" {...register('dueDate')} />
          </div>
          <div className="form-group">
            <label className="form-label">Fichier (max 50 Mo)</label>
            <input type="file" className="form-input" ref={fileRef}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.mp4,.webm,.txt" />
            <p className="form-hint">PDF, Word, PowerPoint, images, vidéos légères</p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget._id)}
        title="Supprimer le devoir"
        message={`Supprimer "${deleteTarget?.title}" et son fichier ?`}
        confirmLabel="Supprimer" danger
      />
    </>
  );
}
