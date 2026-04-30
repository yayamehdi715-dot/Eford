import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyCourses, getCourseStudents, downloadCourseStudentsPdf } from '../../api';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { downloadBlob } from '../../utils/downloadBlob';

export default function TeacherMyClasses() {
  const [selectedCourse, setSelectedCourse] = useState(null);

  const { data: courses, isLoading } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => getMyCourses().then(r => r.data),
  });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['course-students', selectedCourse?._id],
    queryFn: () => getCourseStudents(selectedCourse._id).then(r => r.data),
    enabled: !!selectedCourse,
  });

  const handleDownloadPdf = async () => {
    try {
      const { data: blob } = await downloadCourseStudentsPdf(selectedCourse._id);
      downloadBlob(blob, `eleves-${selectedCourse.title}.pdf`);
    } catch { toast.error('Erreur PDF'); }
  };

  if (isLoading) return <Spinner page />;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Mes classes</h1>
        <p className="page-subtitle">{courses?.length ?? 0} cours assignés</p>
      </div>

      {courses?.length === 0
        ? <EmptyState message="Aucun cours assigné pour le moment" />
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {courses.map(c => (
              <div key={c._id} className="card" style={{ cursor: 'pointer' }} onClick={() => setSelectedCourse(c)}>
                <h3 style={{ fontWeight: 600, marginBottom: '.5rem' }}>{c.title}</h3>
                <p style={{ fontSize: '.8rem', color: 'var(--gray-500)', marginBottom: '.75rem' }}>{c.description || 'Aucune description'}</p>
                <p style={{ fontSize: '.8rem', color: 'var(--gray-600)' }}>🏫 Salle : {c.room?.name || '—'}</p>
                <p style={{ fontSize: '.8rem', color: 'var(--gray-600)' }}>👥 Places : {c.maxStudents}</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '.75rem' }}>Voir les élèves</button>
              </div>
            ))}
          </div>
        )
      }

      <Modal
        isOpen={!!selectedCourse}
        onClose={() => setSelectedCourse(null)}
        title={`Élèves — ${selectedCourse?.title}`}
        footer={
          <div style={{ display: 'flex', gap: '.5rem', width: '100%', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={handleDownloadPdf}>Exporter PDF</button>
            <button className="btn btn-secondary" onClick={() => setSelectedCourse(null)}>Fermer</button>
          </div>
        }
      >
        {studentsLoading ? <Spinner /> : students?.length === 0
          ? <p style={{ color: 'var(--gray-400)', fontSize: '.875rem' }}>Aucun élève inscrit</p>
          : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th></tr></thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s._id}>
                      <td>{s.firstName} {s.lastName}</td>
                      <td>{s.email}</td>
                      <td>{s.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Modal>
    </>
  );
}
