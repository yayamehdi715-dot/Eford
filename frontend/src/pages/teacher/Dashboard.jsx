import { useQuery } from '@tanstack/react-query';
import { getMyCourses, getSchedule } from '../../api';
import Spinner from '../../components/Spinner';
import useAuthStore from '../../store/authStore';

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const { data: courses, isLoading } = useQuery({ queryKey: ['my-courses'], queryFn: () => getMyCourses().then(r => r.data) });
  const { data: schedule } = useQuery({ queryKey: ['schedule-teacher'], queryFn: () => getSchedule().then(r => r.data) });

  const today = new Date().getDay();
  const todaySchedule = (schedule || []).filter(s => s.dayOfWeek === today).sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (isLoading) return <Spinner page />;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Bonjour, {user?.firstName} 👋</h1>
        <p className="page-subtitle">Votre espace enseignant</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Mes cours</p>
          <p className="stat-value">{courses?.length ?? 0}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Cours aujourd'hui</p>
          <p className="stat-value">{todaySchedule.length}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Programme d'aujourd'hui</h3></div>
          {todaySchedule.length === 0
            ? <p style={{ color: 'var(--gray-400)', fontSize: '.875rem' }}>Pas de cours aujourd'hui</p>
            : todaySchedule.map(s => (
                <div key={s._id} className="schedule-slot" style={{ marginBottom: '.5rem' }}>
                  <p className="slot-title">{s.startTime} – {s.endTime}</p>
                  <p className="slot-info">{s.course?.title}</p>
                  <p className="slot-info">Salle : {s.room?.name || '—'}</p>
                </div>
              ))
          }
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Mes cours</h3></div>
          {courses?.length === 0
            ? <p style={{ color: 'var(--gray-400)', fontSize: '.875rem' }}>Aucun cours assigné</p>
            : courses?.map(c => (
                <div key={c._id} style={{ padding: '.5rem 0', borderBottom: '1px solid var(--gray-100)', fontSize: '.875rem' }}>
                  <strong>{c.title}</strong>
                  <p style={{ color: 'var(--gray-500)', fontSize: '.8rem' }}>Salle : {c.room?.name || '—'}</p>
                </div>
              ))
          }
        </div>
      </div>
    </>
  );
}
