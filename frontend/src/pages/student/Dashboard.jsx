import { useQuery } from '@tanstack/react-query';
import { getMyEnrollments, getSchedule, getAssignments, downloadAttestation } from '../../api';
import Spinner from '../../components/Spinner';
import { StatusBadge } from '../../components/Badge';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { downloadBlob } from '../../utils/downloadBlob';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const { data: enrollments, isLoading } = useQuery({ queryKey: ['my-enrollments'], queryFn: () => getMyEnrollments().then(r => r.data) });
  const { data: schedule } = useQuery({ queryKey: ['schedule-student'], queryFn: () => getSchedule().then(r => r.data) });
  const { data: assignments } = useQuery({ queryKey: ['assignments-student', 1], queryFn: () => getAssignments({ page: 1 }).then(r => r.data) });

  const today = new Date().getDay();
  const todaySchedule = (schedule || []).filter(s => s.dayOfWeek === today).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const approved = (enrollments || []).filter(e => e.status === 'approved').length;
  const pending = (enrollments || []).filter(e => e.status === 'pending').length;

  const handleAttestation = async () => {
    try {
      const { data: blob } = await downloadAttestation(user._id);
      downloadBlob(blob, `attestation-${user.lastName}.pdf`);
    } catch { toast.error('Erreur génération PDF'); }
  };

  if (isLoading) return <Spinner page />;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Bonjour, {user?.firstName} 👋</h1>
          <p className="page-subtitle">Votre espace élève</p>
        </div>
        <button className="btn btn-secondary" onClick={handleAttestation}>Attestation de scolarité</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><p className="stat-label">Cours validés</p><p className="stat-value">{approved}</p></div>
        <div className="stat-card"><p className="stat-label">En attente</p><p className="stat-value">{pending}</p></div>
        <div className="stat-card"><p className="stat-label">Devoirs reçus</p><p className="stat-value">{assignments?.total ?? 0}</p></div>
        <div className="stat-card"><p className="stat-label">Cours aujourd'hui</p><p className="stat-value">{todaySchedule.length}</p></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Programme aujourd'hui</h3></div>
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
          <div className="card-header"><h3 className="card-title">Mes inscriptions</h3></div>
          {enrollments?.slice(0, 5).map(e => (
            <div key={e._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid var(--gray-100)', fontSize: '.875rem' }}>
              <span>{e.course?.title}</span>
              <StatusBadge status={e.status} />
            </div>
          ))}
          {(!enrollments || enrollments.length === 0) && <p style={{ color: 'var(--gray-400)', fontSize: '.875rem' }}>Aucune inscription</p>}
        </div>
      </div>
    </>
  );
}
