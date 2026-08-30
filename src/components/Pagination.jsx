import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, pages, total, onChange }) {
  if (pages <= 1) return null
  return (
    <div className="pagination">
      <button className="pg-btn" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Sebelumnya">
        <ChevronLeft size={18} />
      </button>
      <span className="pg-info">
        {page} / {pages} · {total} data
      </span>
      <button className="pg-btn" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Berikutnya">
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
