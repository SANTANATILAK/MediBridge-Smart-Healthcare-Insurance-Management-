import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, dashboardPath } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Logo, Notice } from '../components/ui.jsx';

const PORTALS = {
  patient: { label: 'Patient', email: 'patient@medibridge.in', hint: 'Manage policies, visits and claims.' },
  hospital: { label: 'Hospital', email: 'hospital@medibridge.in', hint: 'Admit patients, track pre-authorization and bill.' },
  insurer: { label: 'Insurance', email: 'insurer@medibridge.in', hint: 'Review claims, verify policies and investigate alerts.' },
  admin: { label: 'Super Admin', email: 'admin@medibridge.in', hint: 'Manage users, partners, transactions and platform activity.' },
};

export default function Login() {
  const [params] = useSearchParams();
  const requested = params.get('portal');
  const portal = PORTALS[requested] ? requested : 'patient';
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: PORTALS[portal].email, password: 'Demo@123', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setForm((f) => ({ ...f, email: PORTALS[portal].email }));
    setMode('login');
    setError('');
  }, [portal]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = mode === 'register'
        ? await api('/auth/register', {
            method: 'POST',
            body: { name: form.name, email: form.email, password: form.password, phone: form.phone },
          })
        : await api('/auth/login', {
            method: 'POST',
            body: { email: form.email, password: form.password, portal: portal.toUpperCase() },
          });
      login(res.token, res.user);
      navigate(dashboardPath(res.user.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-side">
        <Link to="/"><Logo light /></Link>
        <h2>{PORTALS[portal].label} portal</h2>
        <p>{PORTALS[portal].hint}</p>
        <div className="portal-switch">
          {Object.entries(PORTALS).map(([key, p]) => (
            <Link key={key} to={`/login?portal=${key}`} className={key === portal ? 'active' : ''}>{p.label}</Link>
          ))}
        </div>
      </div>

      <div className="login-main">
        <form className="card login-card fade-in" onSubmit={submit}>
          <h1>{mode === 'register' ? 'Create your account' : 'Sign in'}</h1>
          <p className="muted">
            {mode === 'register'
              ? 'Patients can register here. Hospitals and insurers are onboarded by the platform team.'
              : 'Use your portal credentials. Demo accounts are pre-filled.'}
          </p>

          {mode === 'register' && (
            <>
              <label>Full name<input required value={form.name} onChange={set('name')} /></label>
              <label>Phone<input value={form.phone} onChange={set('phone')} placeholder="+91" /></label>
            </>
          )}
          <label>Email<input required type="email" value={form.email} onChange={set('email')} /></label>
          <label>Password<input required type="password" minLength={6} value={form.password} onChange={set('password')} /></label>

          <Notice message={error} />
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
          </button>

          {portal === 'patient' && (
            <button type="button" className="btn btn-link" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>
              {mode === 'register' ? 'Already registered? Sign in' : 'New here? Create a patient account'}
            </button>
          )}
          {mode === 'login' && (
            <p className="muted small demo-note">Demo password: <code>Demo@123</code></p>
          )}
          <Link to="/" className="btn btn-link">← Back to homepage</Link>
        </form>
      </div>
    </div>
  );
}
