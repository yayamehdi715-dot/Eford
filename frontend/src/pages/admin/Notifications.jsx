import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { broadcast } from '../../api';
import { useForm } from 'react-hook-form';

export default function AdminNotifications() {
  const { register, handleSubmit, reset } = useForm();

  const sendMut = useMutation({
    mutationFn: broadcast,
    onSuccess: () => { toast.success('Notification envoyée'); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Envoyer une notification</h1>
        <p className="page-subtitle">Diffusez une alerte à tous les utilisateurs ou à un groupe</p>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <form onSubmit={handleSubmit(d => sendMut.mutate(d))}>
          <div className="form-group">
            <label className="form-label">Destinataires *</label>
            <select className="form-input" {...register('role', { required: true })}>
              <option value="all">Tous les utilisateurs</option>
              <option value="teacher">Professeurs seulement</option>
              <option value="student">Élèves seulement</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Type *</label>
            <select className="form-input" {...register('type', { required: true })}>
              <option value="general">Général</option>
              <option value="absence">Absence</option>
              <option value="assignment">Devoir</option>
              <option value="enrollment">Inscription</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Titre *</label>
            <input className="form-input" {...register('title', { required: true, maxLength: 200 })} placeholder="Titre de la notification..." />
          </div>
          <div className="form-group">
            <label className="form-label">Message *</label>
            <textarea className="form-input" rows={4} {...register('message', { required: true, maxLength: 1000 })} placeholder="Contenu du message..." />
          </div>
          <button type="submit" className="btn btn-primary" disabled={sendMut.isPending}>
            {sendMut.isPending ? 'Envoi...' : 'Envoyer la notification'}
          </button>
        </form>
      </div>
    </>
  );
}
