import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getMyCourses, getCourseStudents, recordStudentAbsences } from '../../api';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import toast from 'react-hot-toast';

export default function TeacherAttendance() {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [absentIds, setAbsentIds] = useState(new Set());
  const [submitted, setSubmitted] = useState(false);

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => getMyCourses().then(r => r.data),
  });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['course-students', selectedCourse],
    queryFn: () => getCourseStudents(selectedCourse).then(r => r.data),
    enabled: !!selectedCourse,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: recordStudentAbsences,
    onSuccess: () => { toast.success('Appel enregistré'); setSubmitted(true); setAbsentIds(new Set()); },
    onError: () => toast.error('Erreur enregistrement'),
  });

  const toggleAbsent = (id) => {
    setAbsentIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setSubmitted(false);
  };

  const handleSubmit = () => {
    if (!selectedCourse || !date) return toast.error('Sélectionnez un cours et une date');
    mutate({ courseId: selectedCourse, date, absentStudentIds: [...absentIds] });
  };

  if (coursesLoading) return <Spinner page />;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Faire l'appel</h1>
        <p className="page-subtitle">Enregistrez les absences élèves</p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cours *</label>
            <select className="form-input" value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value); setAbsentIds(new Set()); setSubmitted(false); }}>
              <option value="">Choisir un cours...</option>
              {courses?.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Date *</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      {selectedCourse && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Liste des élèves ({students?.length ?? 0})</h3>
            <p className="text-sm" style={{ color: 'var(--gray-500)' }}>Cochez les ABSENTS</p>
          </div>

          {studentsLoading ? <Spinner /> : students?.length === 0
            ? <EmptyState message="Aucun élève inscrit" />
            : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '.5rem', marginBottom: '1rem' }}>
                  {students.map(s => (
                    <label
                      key={s._id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '.75rem',
                        padding: '.6rem .75rem', borderRadius: 'var(--radius)',
                        border: `1px solid ${absentIds.has(s._id) ? 'var(--danger)' : 'var(--gray-200)'}`,
                        background: absentIds.has(s._id) ? 'var(--danger-light)' : 'white',
                        cursor: 'pointer', fontSize: '.875rem', transition: 'all .15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={absentIds.has(s._id)}
                        onChange={() => toggleAbsent(s._id)}
                        style={{ accentColor: 'var(--danger)' }}
                      />
                      {s.firstName} {s.lastName}
                    </label>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button className="btn btn-primary" onClick={handleSubmit} disabled={isPending}>
                    {isPending ? 'Enregistrement...' : `Enregistrer (${absentIds.size} absent${absentIds.size > 1 ? 's' : ''})`}
                  </button>
                  {submitted && <span style={{ color: 'var(--success)', fontSize: '.875rem', fontWeight: 600 }}>✓ Appel enregistré</span>}
                </div>
              </>
            )
          }
        </div>
      )}
    </>
  );
}
