const BADGE_TONE = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  ADMITTED: 'info',
  INFO_REQUESTED: 'warn',
  PENDING_REVIEW: 'warn',
  APPROVED: 'success',
  SETTLED: 'success',
  DISCHARGED: 'success',
  REJECTED: 'danger',
  NO_ACTIVE_POLICY: 'danger',
};

export function Logo({ light = false }) {
  return (
    <span className={`logo ${light ? 'logo-light' : ''}`}>
      <span className="logo-mark" aria-hidden="true">+</span>
      MediBridge
    </span>
  );
}

export function Stat({ label, value, hint, tone = '' }) {
  return (
    <div className={`card stat ${tone}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function Badge({ value }) {
  const key = String(value || '').toUpperCase();
  const tone = BADGE_TONE[key] || 'neutral';
  return <span className={`badge badge-${tone}`}>{key.replace(/_/g, ' ') || '—'}</span>;
}

export function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
      <div className="progress-fill" style={{ width: `${pct}%` }} />
      <span className="progress-label">{pct}% used</span>
    </div>
  );
}

export function Empty({ text }) {
  return <div className="empty">{text}</div>;
}

export function Notice({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="notice" role="status">
      <span>{message}</span>
      {onClose && <button className="notice-close" onClick={onClose} aria-label="Dismiss">×</button>}
    </div>
  );
}
