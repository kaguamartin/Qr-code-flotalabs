import { useEffect } from 'react';
import * as Icons from 'lucide-react';

export function StatCard({ label, value, sublabel, trend }) {
  return (
    <div className="card p-4">
      <p className="text-xs mb-1" style={{ color: 'var(--color-ink-secondary)' }}>{label}</p>
      <p className="text-2xl font-medium tracking-tight">{value}</p>
      {sublabel && (
        <p
          className="text-xs mt-1"
          style={{ color: trend === 'up' ? 'var(--color-success-fg)' : 'var(--color-ink-secondary)' }}
        >
          {sublabel}
        </p>
      )}
    </div>
  );
}

const statusStyles = {
  active:       { bg: 'var(--color-success-bg)',  fg: 'var(--color-success-fg)',  label: 'Active' },
  attention:    { bg: 'var(--color-warning-bg)',  fg: 'var(--color-warning-fg)',  label: 'Needs attention' },
  pending:      { bg: 'var(--color-warning-bg)',  fg: 'var(--color-warning-fg)',  label: 'Pending' },
  invited:      { bg: 'var(--color-info-bg)',     fg: 'var(--color-info-fg)',     label: 'Invited' },
  suspended:    { bg: 'var(--color-danger-bg)',   fg: 'var(--color-danger-fg)',   label: 'Suspended' },
  connected:    { bg: 'var(--color-success-bg)',  fg: 'var(--color-success-fg)',  label: 'Connected' },
  disconnected: { bg: 'var(--color-canvas)',      fg: 'var(--color-ink-secondary)', label: 'Not connected' },
};

export function StatusBadge({ status }) {
  const s = statusStyles[status] ?? statusStyles.disconnected;
  return (
    <span className="badge" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

export function TypeChip({ color, children }) {
  return (
    <span
      className="badge"
      style={{ background: `var(--color-type-${color}-bg)`, color: `var(--color-type-${color}-fg)` }}
    >
      {children}
    </span>
  );
}

// Reusable toast notification, replacing native alert()/confirm() popups
// which look like a raw browser dialog instead of part of the app. Usage
// pattern in a page: const [toast, setToast] = useState(null); render
// {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}; then
// setToast({ message: '...', type: 'error' }) instead of alert(...).
// Auto-dismisses after 4s; also dismissible by click.
export function Toast({ message, type = 'error', onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const isError = type === 'error';
  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg max-w-sm cursor-pointer"
      style={{
        background: isError ? 'var(--color-danger-fg)' : 'var(--color-ink-primary)',
        color: 'white',
      }}
      onClick={onDismiss}
    >
      {isError ? <Icons.AlertCircle size={16} className="shrink-0" /> : <Icons.CheckCircle size={16} className="shrink-0" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}

// Reusable confirmation dialog for destructive/reversible actions
// (archiving a link, deleting a bio page button, etc). Keep this generic —
// callers pass their own copy rather than this component knowing about
// specific entities.
export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="card p-5 w-full max-w-xs">
        <p className="text-sm font-medium mb-1.5">{title}</p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-ink-secondary)' }}>{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center text-sm">Cancel</button>
          <button
            onClick={onConfirm}
            className="flex-1 justify-center text-sm rounded-lg font-medium py-2 flex items-center"
            style={{ background: danger ? 'var(--color-danger-fg)' : 'var(--color-brand-blue)', color: 'white' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}