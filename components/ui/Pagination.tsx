import { Icon } from "./Icon";

export function Pagination({
  page,
  limit,
  total,
  onChange,
  itemLabel = "件收藏品",
}: {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
  itemLabel?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) {
    return <p className="pagination-total">共 {total} {itemLabel}</p>;
  }
  const numbers = new Set<number>([1, pages, page - 1, page, page + 1]);
  const sorted = [...numbers].filter((value) => value >= 1 && value <= pages).sort((a, b) => a - b);
  return (
    <nav className="pagination" aria-label="分页">
      <span className="pagination-total">共 {total} {itemLabel}</span>
      <div className="pagination-controls">
        <button
          type="button"
          className="page-btn"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="上一页"
        >
          <Icon name="chevron-left" size={16} />
        </button>
        {sorted.map((value, index) => {
          const previous = sorted[index - 1];
          const gap = previous != null && value - previous > 1;
          return (
            <span key={value} className="page-group">
              {gap ? <span className="page-gap">…</span> : null}
              <button
                type="button"
                className={`page-btn ${value === page ? "is-current" : ""}`}
                onClick={() => onChange(value)}
                aria-current={value === page ? "page" : undefined}
              >
                {value}
              </button>
            </span>
          );
        })}
        <button
          type="button"
          className="page-btn"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          aria-label="下一页"
        >
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
    </nav>
  );
}