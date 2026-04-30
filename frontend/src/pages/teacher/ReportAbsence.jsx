import { useMutation } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { getMyCourses, reportTeacherAbsence } from '../../api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Spinner from '../../components/Spinner';

export default function TeacherReportAbsence() {
  const { data: courses, isLoading } = useQuery({ queryKey: ['my-courses'], queryFn: () => getMyCourses().then(r => r.data) });
  const { register, handleSubmit, reset } = useForm();

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: reportTeacherAbsence,
    onSuccess: () => { toast.success('Absence signalée, les élèves ont été notifiés'); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  if (isLoading) return <Spinner page />;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Signaler mon absence</h1>
        <p className="page-subtitle">Les élèves du cours concerné seront notifiés automatiquement</p>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        {isSuccess && (
          <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '.75rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '.875rem', fontWeight: 600 }}>
            ✓ Absence signalée. Tous les élèves du cours ont été notifiés par email et dans l'application.
          </div>
        )}
        <form onSubmit={handleSubmit(d => mutate(d))}>
          <div className="form-group">
            <label className="form-label">Cours concerné *</label>
            <select className="form-input" {...register('courseId', { required: true })}>
              <option value="">Choisir un cours...</option>
              {courses?.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date d'absence *</label>
            <input type="date" className="form-input" {...register('date', { required: true })} defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="form-group">
            <label className="form-label">Raison (optionnel)</label>
            <textarea className="form-input" rows={3} {...register('reason')} placeholder="Raison de l'absence..." />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isPending}>
            {isPending ? 'Envoi...' : 'Signaler l\'absence'}
          </button>
        </form>
      </div>
    </>
  );
}
