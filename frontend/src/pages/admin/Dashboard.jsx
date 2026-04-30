import { useQuery } from '@tanstack/react-query';
import { getStats } from '../../api';
import Spinner from '../../components/Spinner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => getStats().then(r => r.data),
  });

  if (isLoading) return <Spinner page />;

  const { overview, popularCourses, enrollmentsByMonth = [], absencesByUser = [] } = data || {};

  // Prépare les données mensuelles pour le graphique
  const chartData = MONTHS.map((month, i) => {
    const monthNum = i + 1;
    const entry = enrollmentsByMonth.find(e => e._id.month === monthNum) || {};
    return { month, inscriptions: entry.count || 0 };
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-subtitle">Vue d'ensemble de l'établissement</p>
      </div>

      <div className="stats-grid">
        <StatCard label="Élèves actifs" value={overview?.totalStudents ?? 0} icon="👨‍🎓" />
        <StatCard label="Professeurs" value={overview?.totalTeachers ?? 0} icon="👨‍🏫" />
        <StatCard label="Cours actifs" value={overview?.totalCourses ?? 0} icon="📚" />
        <StatCard label="Inscriptions en attente" value={overview?.pendingEnrollments ?? 0} icon="⏳" />
        <StatCard label="Taux de présence" value={`${overview?.attendanceRate ?? 0}%`} icon="✅" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Inscriptions par mois</h3></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="inscriptions" fill="var(--primary)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Cours populaires</h3></div>
          {popularCourses?.length === 0
            ? <p style={{ color: 'var(--gray-400)', fontSize: '.875rem' }}>Aucune donnée</p>
            : <div className="table-wrap">
                <table>
                  <thead><tr><th>Cours</th><th>Inscrits</th></tr></thead>
                  <tbody>
                    {popularCourses?.map(c => (
                      <tr key={c._id}><td>{c.title}</td><td><strong>{c.count}</strong></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Élèves les plus absents</h3></div>
        {absencesByUser?.length === 0
          ? <p style={{ color: 'var(--gray-400)', fontSize: '.875rem' }}>Aucune absence enregistrée</p>
          : <div className="table-wrap">
              <table>
                <thead><tr><th>Élève</th><th>Absences</th></tr></thead>
                <tbody>
                  {absencesByUser.map(a => (
                    <tr key={a._id}>
                      <td>{a.firstName} {a.lastName}</td>
                      <td><strong>{a.count}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>{icon}</div>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}
