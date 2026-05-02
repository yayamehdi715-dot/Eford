import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSchedule, createSchedule, deleteSchedule, getCourses, getRooms, getTeachers } from '../../api';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6];

const emptyForm = { course: '', room: '', dayOfWeek: 1, startTime: '08:00', endTime: '10:00' };

export default function AdminSchedule() {
  const qc = useQueryClient();
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const params = {};
  if (filterTeacher) params.teacher = filterTeacher;
  if (filterRoom) params.room = filterRoom;

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedule', params],
    queryFn: () => getSchedule(params).then(r => r.data),
  });

  const { data: courses } = useQuery({ queryKey: ['courses-list'], queryFn: () => getCourses({ limit: 100 }).then(r => r.data) });
  const { data: rooms } = useQuery({ queryKey: ['rooms'], queryFn: () => getRooms().then(r => r.data) });
  const { data: teachers } = useQuery({ queryKey: ['teachers-list'], queryFn: () => getTeachers({ limit: 100 }).then(r => r.data) });

  const createMut = useMutation({
    mutationFn: createSchedule,
    onSuccess: () => { toast.success('Créneau ajouté'); qc.invalidateQueries(['schedule']); setShowCreate(false); setForm(emptyForm); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => { toast.success('Créneau supprimé'); qc.invalidateQueries(['schedule']); setDeleteTarget(null); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.course || !form.room) { toast.error('Cours et salle requis'); return; }
    createMut.mutate({
      course: form.course,
      room: form.room,
      days: [{ dayOfWeek: Number(form.dayOfWeek), startTime: form.startTime, endTime: form.endTime }],
    });
  };

  const byDay = (schedules || []).reduce((acc, s) => {
    acc[s.dayOfWeek] = acc[s.dayOfWeek] || [];
    acc[s.dayOfWeek].push(s);
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Emploi du temps global</h1>
      </div>

      <div className="filters-bar">
        <div className="form-group">
          <label className="form-label">Filtrer par professeur</label>
          <select className="form-input" value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">Tous</option>
            {(teachers?.data || []).map(t => <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Filtrer par salle</label>
          <select className="form-input" value={filterRoom} onChange={e => setFilterRoom(e.target.value)} style={{ minWidth: 160 }}>
            <option value="">Toutes</option>
            {(rooms || []).map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Ajouter créneau</button>
      </div>

      <div className="card">
        {isLoading ? <Spinner page /> : (
          <div className="schedule-grid">
            <table className="schedule-table">
              <thead>
                <tr>
                  {DISPLAY_DAYS.map(d => <th key={d}>{DAYS[d]}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {DISPLAY_DAYS.map(d => (
                    <td key={d} style={{ verticalAlign: 'top', minWidth: 140 }}>
                      {(byDay[d] || []).sort((a, b) => a.startTime.localeCompare(b.startTime)).map(s => (
                        <div key={s._id} className="schedule-slot">
                          <p className="slot-title">{s.startTime}–{s.endTime}</p>
                          <p className="slot-info">{s.course?.title}</p>
                          <p className="slot-info">{s.room?.name}</p>
                          <p className="slot-info" style={{ fontSize: '.65rem' }}>
                            {s.teacher?.firstName} {s.teacher?.lastName}
                          </p>
                          <button
                            onClick={() => setDeleteTarget(s)}
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '.7rem', cursor: 'pointer', padding: 0, marginTop: 2 }}
                          >
                            Supprimer
                          </button>
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setForm(emptyForm); }}
        title="Ajouter un créneau"
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setShowCreate(false); setForm(emptyForm); }}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={createMut.isPending}>
            Ajouter
          </button>
        </>}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Cours *</label>
            <select className="form-input" value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} required>
              <option value="">Choisir un cours...</option>
              {(courses?.data || []).map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
            <p className="form-hint">Le professeur sera automatiquement déduit du cours.</p>
          </div>
          <div className="form-group">
            <label className="form-label">Salle *</label>
            <select className="form-input" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} required>
              <option value="">Choisir une salle...</option>
              {(rooms || []).map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.75rem' }}>
            <div className="form-group">
              <label className="form-label">Jour *</label>
              <select className="form-input" value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}>
                {DISPLAY_DAYS.map(d => <option key={d} value={d}>{DAYS[d]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Début *</label>
              <input type="time" className="form-input" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Fin *</label>
              <input type="time" className="form-input" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} required />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget._id)}
        title="Supprimer le créneau"
        message={`Supprimer ce créneau (${deleteTarget?.course?.title}) ?`}
        confirmLabel="Supprimer" danger
      />
    </>
  );
}
