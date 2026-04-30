const variants = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  gray: 'badge-gray',
};

export default function Badge({ children, variant = 'gray' }) {
  return <span className={`badge ${variants[variant] || variants.gray}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  const map = {
    approved: { label: 'Approuvé', variant: 'success' },
    pending:  { label: 'En attente', variant: 'warning' },
    rejected: { label: 'Refusé', variant: 'danger' },
    active:   { label: 'Actif', variant: 'success' },
    inactive: { label: 'Inactif', variant: 'danger' },
  };
  const { label, variant } = map[status] || { label: status, variant: 'gray' };
  return <Badge variant={variant}>{label}</Badge>;
}
