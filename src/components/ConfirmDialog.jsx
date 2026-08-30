import Modal from './Modal'

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Hapus', busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: 14 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={busy}>
          Batal
        </button>
        <button className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>
          {busy ? 'Memproses...' : confirmText}
        </button>
      </div>
    </Modal>
  )
}
