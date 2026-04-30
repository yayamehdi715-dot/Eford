import { useQuery } from '@tanstack/react-query';
import { getStats } from '../../api';
import Spinner from '../../components/Spinner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export default function AdminStatistics() {
  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => getStats().then(r => r.data),
  });

  if (isLoading) return <Spinner page />;

  const { overview, popularCourses = [], absencesByUser = [], enrollmentsByMonth = [] } = data || {};

  const monthlyChart = MONTHS.map((month, i) => {
    const entry = enrollmentsByMonth.find(e => e._id.month === i + 1);
    return { month, inscriptions: entry?.count || 0 };
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Statistiques</h1>
        <p className="page-subtitle">Analyse de l'activité de l'établissement</p>
      </div>

      <div className="stats-grid">
        <Stat label="Élèves actifs" value={overview?.totalStudents ?? 0} />
        <Stat label="Professeurs" value={overview?.totalTeachers ?? 0} />
        <Stat label="Cours actifs" value={overview?.totalCourses ?? 0} />
        <Stat label="Taux présence" value={`${overview?.attendanceRate ?? 0}%`} />
        <Stat label="Inscriptions en attente" value={overview?.pendingEnrollments ?? 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Évolution des inscriptions</h3></div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyChart}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="inscriptions" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Cours les plus populaires</h3></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={popularCourses.slice(0, 6)} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="title" width={100} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--primary)" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Élèves avec le plus d'absences</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Élève</th><th>Nombre d'absences</th></tr></thead>
            <tbody>
              {absencesByUser.map(a => (
                <tr key={a._id}>
                  <td>{a.firstName} {a.lastName}</td>
                  <td><strong>{a.count}</strong></td>
                </tr>
              ))}
              {absencesByUser.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--gray-400)' }}>Aucune donnée</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}
