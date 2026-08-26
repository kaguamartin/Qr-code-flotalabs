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
