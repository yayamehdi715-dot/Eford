import { useQuery } from '@tanstack/react-query';
import { getSchedule, downloadSchedulePdf } from '../../api';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { downloadBlob } from '../../utils/downloadBlob';

const DAYS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6];

export default function TeacherSchedule() {
  const { user } = useAuthStore();
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedule-teacher'],
    queryFn: () => getSchedule().then(r => r.data),
  });

  const byDay = (schedules || []).reduce((acc, s) => {
    acc[s.dayOfWeek] = acc[s.dayOfWeek] || [];
    acc[s.dayOfWeek].push(s);
    return acc;
  }, {});

  const handlePdf = async () => {
    try {
      const { data: blob } = await downloadSchedulePdf(user._id);
      downloadBlob(blob, 'mon-emploi-du-temps.pdf');
    } catch { toast.error('Erreur PDF'); }
  };

  if (isLoading) return <Spinner page />;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Mon emploi du temps</h1>
          <p className="page-subtitle">Planning hebdomadaire</p>
        </div>
        <button className="btn btn-secondary" onClick={handlePdf}>Exporter PDF</button>
      </div>

      {schedules?.length === 0 ? <EmptyState message="Aucun créneau programmé" /> : (
        <div className="card">
          <div className="schedule-grid">
            <table className="schedule-table">
              <thead>
                <tr>{DISPLAY_DAYS.map(d => <th key={d}>{DAYS[d]}</th>)}</tr>
              </thead>
              <tbody>
                <tr>
                  {DISPLAY_DAYS.map(d => (
                    <td key={d} style={{ verticalAlign: 'top', minWidth: 130 }}>
                      {(byDay[d] || []).sort((a, b) => a.startTime.localeCompare(b.startTime)).map(s => (
                        <div key={s._id} className="schedule-slot">
                          <p className="slot-title">{s.startTime} – {s.endTime}</p>
                          <p className="slot-info">{s.course?.title}</p>
                          <p className="slot-info">Salle : {s.room?.name || '—'}</p>
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
