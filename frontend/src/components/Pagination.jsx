export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1}>‹</button>
      {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
        const p = i + 1;
        return (
          <button key={p} className={page === p ? 'active' : ''} onClick={() => onChange(p)}>
            {p}
          </button>
        );
      })}
      <button onClick={() => onChange(page + 1)} disabled={page >= pages}>›</button>
    </div>
  );
}
