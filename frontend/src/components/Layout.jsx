import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Logo } from './ui.jsx';

/** Shared dashboard shell: sidebar navigation, header and logout. */
export default function DashboardLayout({ title, subtitle, tabs, active, onChange, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="dash">
      <aside className="sidebar">
        <Link to="/" className="sidebar-brand"><Logo light /></Link>
        <nav className="sidebar-nav" aria-label="Dashboard">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`nav-item ${active === t.key ? 'active' : ''}`}
              onClick={() => onChange(t.key)}
            >
              <span className="nav-icon" aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-user">
            <div className="avatar">{(user?.name || '?').charAt(0)}</div>
            <div>
              <div className="sidebar-name">{user?.name}</div>
              <div className="sidebar-role">{user?.role?.toLowerCase()} portal</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-block"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="dash-main">
        <header className="dash-head">
          <div>
            <h1>{title}</h1>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
