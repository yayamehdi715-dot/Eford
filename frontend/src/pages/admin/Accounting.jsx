import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getTransactions, createTransaction, deleteTransaction, getMonthlyData, exportAccountingPdf } from '../../api';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import Badge from '../../components/Badge';
import { downloadBlob } from '../../utils/downloadBlob';
import { useForm } from 'react-hook-form';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const YEAR = new Date().getFullYear();

export default function AdminAccounting() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, type, from, to],
    queryFn: () => getTransactions({ page, type: type || undefined, from: from || undefined, to: to || undefined }).then(r => r.data),
  });

  const { data: monthly } = useQuery({
    queryKey: ['monthly', YEAR],
    queryFn: () => getMonthlyData({ year: YEAR }).then(r => r.data),
  });

  const { register, handleSubmit, reset } = useForm();

  const createMut = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => { toast.success('Transaction ajoutée'); qc.invalidateQueries(['transactions']); setShowCreate(false); reset(); },
    onError: () => toast.error('Erreur'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => { toast.success('Supprimé'); qc.invalidateQueries(['transactions']); setDeleteTarget(null); },
  });

  const handleExport = async () => {
    try {
      const { data: blob } = await exportAccountingPdf({ from, to });
      downloadBlob(blob, 'rapport-comptable.pdf');
    } catch { toast.error('Erreur export PDF'); }
  };

  // Prépare données graphique mensuel
  const chartData = MONTHS.map((month, i) => {
    const monthNum = i + 1;
    const inc = monthly?.find(m => m._id.month === monthNum && m._id.type === 'income')?.total || 0;
    const exp = monthly?.find(m => m._id.month === monthNum && m._id.type === 'expense')?.total || 0;
    return { month, Revenus: inc, Dépenses: exp };
  });

  const { summary } = data || {};

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Comptabilité</h1>
      </div>

      {summary && (
        <div className="stats-grid" style={{ marginBottom: '1rem' }}>
          <div className="stat-card"><p className="stat-label">Revenus</p><p className="stat-value" style={{ color: 'var(--success)' }}>{summary.income?.toFixed(2)} €</p></div>
          <div className="stat-card"><p className="stat-label">Dépenses</p><p className="stat-value" style={{ color: 'var(--danger)' }}>{summary.expense?.toFixed(2)} €</p></div>
          <div className="stat-card"><p className="stat-label">Solde</p><p className="stat-value" style={{ color: summary.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>{summary.balance?.toFixed(2)} €</p></div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header"><h3 className="card-title">Revenus vs Dépenses {YEAR}</h3></div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => `${v.toFixed(2)} €`} />
            <Legend />
            <Bar dataKey="Revenus" fill="var(--success)" radius={[4,4,0,0]} />
            <Bar dataKey="Dépenses" fill="var(--danger)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="filters-bar">
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-input" value={type} onChange={e => setType(e.target.value)} style={{ minWidth: 130 }}>
            <option value="">Tous</option>
            <option value="income">Revenus</option>
            <option value="expense">Dépenses</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Du</label>
          <input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Au</label>
          <input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button className="btn btn-secondary" onClick={handleExport}>Export PDF</button>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Ajouter</button>
      </div>

      <div className="card">
        {isLoading ? <Spinner page /> : data?.data?.length === 0 ? <EmptyState message="Aucune transaction" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Catégorie</th><th>Montant</th><th>Description</th><th></th></tr></thead>
              <tbody>
                {data.data.map(t => (
                  <tr key={t._id}>
                    <td>{format(new Date(t.date), 'dd/MM/yyyy', { locale: fr })}</td>
                    <td><Badge variant={t.type === 'income' ? 'success' : 'danger'}>{t.type === 'income' ? 'Revenu' : 'Dépense'}</Badge></td>
                    <td>{t.category}</td>
                    <td><strong style={{ color: t.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                      {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(2)} €
                    </strong></td>
                    <td>{t.description}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(t)}>Suppr.</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={data?.pages || 1} onChange={setPage} />
      </div>

      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Nouvelle transaction"
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setShowCreate(false); reset(); }}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSubmit(d => createMut.mutate(d))} disabled={createMut.isPending}>Ajouter</button>
        </>}
      >
        <form>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select className="form-input" {...register('type', { required: true })}>
                <option value="">Choisir...</option>
                <option value="income">Revenu</option>
                <option value="expense">Dépense</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Catégorie *</label>
              <select className="form-input" {...register('category', { required: true })}>
                <option value="">Choisir...</option>
                <option value="inscription">Inscription</option>
                <option value="salaire">Salaire</option>
                <option value="materiel">Matériel</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <div className="form-group">
              <label className="form-label">Montant (€) *</label>
              <input type="number" step="0.01" min={0} className="form-input" {...register('amount', { required: true, min: 0 })} />
            </div>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input type="date" className="form-input" {...register('date', { required: true })} defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <input className="form-input" {...register('description', { required: true })} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget._id)}
        title="Supprimer la transaction" message="Confirmer la suppression ?" confirmLabel="Supprimer" danger
      />
    </>
  );
}
