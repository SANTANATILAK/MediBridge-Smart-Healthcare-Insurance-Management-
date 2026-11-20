import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, formatDate, formatDateTime, formatINR } from '../api.js';
import DashboardLayout from '../components/Layout.jsx';
import AssistantChat from '../components/AssistantChat.jsx';
import { Badge, Empty, Notice, ProgressBar, Stat } from '../components/ui.jsx';

const TABS = [
  { key: 'overview', label: 'Overview', icon: '🏠' },
  { key: 'policies', label: 'Policies & Coverage', icon: '🛡️' },
  { key: 'hospitals', label: 'Find Hospitals', icon: '🏥' },
  { key: 'visits', label: 'Appointments & Visits', icon: '📅' },
  { key: 'claims', label: 'Claims', icon: '📄' },
  { key: 'notifications', label: 'Notifications', icon: '🔔' },
  { key: 'profile', label: 'My Profile', icon: '👤' },
  { key: 'assistant', label: 'AI Assistant', icon: '🤖' },
];

const OPEN_CLAIM_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED'];

export default function PatientDashboard() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [insurers, setInsurers] = useState([]);
  const [msg, setMsg] = useState('');
  const [city, setCity] = useState('');
  const [compare, setCompare] = useState([]);
  const [explanation, setExplanation] = useState('');
  const [profile, setProfile] = useState(null);

  const load = async () => {
    const [d, h, i] = await Promise.all([
      api('/patient/dashboard'),
      api('/public/hospitals'),
      api('/public/insurers'),
    ]);
    setData(d);
    setHospitals(h);
    setInsurers(i);
    setProfile((p) => p || d.profile);
  };

  useEffect(() => {
    load().catch((e) => setMsg(e.message));
  }, []);

  const insurerName = (id) => insurers.find((i) => i.id === id)?.name || 'Insurer';
  const hospitalName = (id) => hospitals.find((h) => h.id === id)?.name || 'Hospital';

  const claimChart = useMemo(() => {
    const counts = {};
    (data?.claims || []).forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [data]);

  const visibleHospitals = hospitals.filter((h) => h.city.toLowerCase().includes(city.trim().toLowerCase()));
  const compared = hospitals.filter((h) => compare.includes(h.id));

  const toggleCompare = (id) =>
    setCompare((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length >= 3 ? list : [...list, id]));

  async function submitClaim(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const res = await api('/patient/claims', {
        method: 'POST',
        body: {
          policyId: Number(f.get('policyId')),
          visitId: f.get('visitId') ? Number(f.get('visitId')) : null,
          amount: Number(f.get('amount')),
          description: f.get('description'),
        },
      });
      setMsg(`Claim ${res.claimNumber} submitted${res.fraudRisk ? ' and routed for human review' : ''}.`);
      e.target.reset();
      await load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function explainPolicy(p) {
    setExplanation('Analysing your policy…');
    try {
      const r = await api('/ai/explain-policy', {
        method: 'POST',
        body: {
          planName: p.planName,
          insurerName: insurerName(p.insurerId),
          sumInsured: Number(p.sumInsured),
          usedAmount: Number(p.usedAmount),
          remainingCoverage: Number(p.remainingCoverage),
          validTo: p.validTo,
        },
      });
      setExplanation(r.explanation);
    } catch (err) {
      setExplanation(err.message);
    }
  }

  async function markAllRead() {
    await api('/patient/notifications/read-all', { method: 'POST' });
    await load();
  }

  async function saveProfile(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const saved = await api('/patient/profile', {
        method: 'PUT',
        body: {
          fullName: f.get('fullName'),
          phone: f.get('phone'),
          city: f.get('city'),
          address: f.get('address'),
          bloodGroup: f.get('bloodGroup'),
        },
      });
      setProfile(saved);
      setMsg('Profile updated.');
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (!data) {
    return (
      <DashboardLayout title="Patient dashboard" tabs={TABS} active={tab} onChange={setTab}>
        <Notice message={msg || 'Loading your records…'} />
      </DashboardLayout>
    );
  }

  const openClaims = data.claims.filter((c) => OPEN_CLAIM_STATUSES.includes(c.status)).length;
  const admitted = data.visits.filter((v) => v.status === 'ADMITTED');
  const unread = data.notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout
      title={`Welcome back, ${profile?.fullName?.split(' ')[0] || 'there'}`}
      subtitle="Your policies, visits, claims and care journey in one place."
      tabs={TABS.map((t) => (t.key === 'notifications' && unread ? { ...t, label: `Notifications (${unread})` } : t))}
      active={tab}
      onChange={setTab}
    >
      <Notice message={msg} onClose={() => setMsg('')} />

      {tab === 'overview' && (
        <>
          <div className="grid-4">
            <Stat label="Total sum insured" value={formatINR(data.totalSumInsured)} />
            <Stat label="Remaining coverage" value={formatINR(data.totalRemaining)} tone="accent" />
            <Stat label="Open claims" value={openClaims} hint={`${data.claims.length} claims in total`} />
            <Stat label="Active admissions" value={admitted.length} hint="Tracked with your UHT ID" />
          </div>

          {admitted.map((v) => (
            <div key={v.id} className="card highlight">
              <div>
                <strong>Current admission · {hospitalName(v.hospitalId)}</strong>
                <div className="muted small">UHT ID <code>{v.uhtId}</code> · {v.diagnosis}</div>
              </div>
              <div className="row-end">
                <Badge value={v.preAuthStatus} />
              </div>
            </div>
          ))}

          <div className="grid-2">
            <div className="card">
              <h3>Claims by status</h3>
              {claimChart.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={claimChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1d6fd8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty text="No claims yet." />}
            </div>
            <div className="card">
              <h3>Coverage usage</h3>
              {data.policies.length ? data.policies.map((p) => (
                <div key={p.id} className="coverage-row">
                  <div className="row-between">
                    <strong>{p.planName}</strong>
                    <span className="muted small">{formatINR(p.remainingCoverage)} left</span>
                  </div>
                  <ProgressBar value={Number(p.usedAmount)} max={Number(p.sumInsured)} />
                </div>
              )) : <Empty text="No policies linked to your profile." />}
            </div>
          </div>

          <div className="card">
            <h3>Latest notifications</h3>
            {data.notifications.slice(0, 3).map((n) => (
              <div key={n.id} className={`note ${n.read ? '' : 'unread'}`}>
                <strong>{n.title}</strong>
                <span className="muted small"> · {formatDateTime(n.createdAt)}</span>
                <div>{n.message}</div>
              </div>
            ))}
            {!data.notifications.length && <Empty text="You're all caught up." />}
          </div>
        </>
      )}

      {tab === 'policies' && (
        <>
          <div className="grid-2">
            {data.policies.map((p) => (
              <div key={p.id} className="card policy-card">
                <div className="row-between">
                  <div>
                    <div className="muted small">{insurerName(p.insurerId)} · {p.policyNumber}</div>
                    <h3>{p.planName}</h3>
                  </div>
                  <Badge value={p.active ? 'APPROVED' : 'REJECTED'} />
                </div>
                <div className="policy-figures">
                  <div><span className="muted small">Sum insured</span><strong>{formatINR(p.sumInsured)}</strong></div>
                  <div><span className="muted small">Used</span><strong>{formatINR(p.usedAmount)}</strong></div>
                  <div><span className="muted small">Remaining</span><strong className="text-accent">{formatINR(p.remainingCoverage)}</strong></div>
                </div>
                <ProgressBar value={Number(p.usedAmount)} max={Number(p.sumInsured)} />
                <div className="muted small">Valid {formatDate(p.validFrom)} – {formatDate(p.validTo)}</div>
                <button className="btn btn-outline" onClick={() => { setTab('assistant'); explainPolicy(p); }}>
                  Explain with AI
                </button>
              </div>
            ))}
          </div>
          {!data.policies.length && <Empty text="No policies found." />}
          {explanation && (
            <div className="card explanation">
              <h3>AI policy explanation</h3>
              <p>{explanation}</p>
            </div>
          )}
        </>
      )}

      {tab === 'hospitals' && (
        <>
          <div className="card toolbar">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Search by city, e.g. Bhubaneswar"
              aria-label="Search hospitals by city"
            />
            <span className="muted small">Select up to three hospitals to compare.</span>
          </div>

          <div className="grid-3">
            {visibleHospitals.map((h) => (
              <label key={h.id} className={`card hospital-card ${compare.includes(h.id) ? 'selected' : ''}`}>
                <div className="row-between">
                  <strong>{h.name}</strong>
                  <input type="checkbox" checked={compare.includes(h.id)} onChange={() => toggleCompare(h.id)} />
                </div>
                <div className="muted small">{h.city}, {h.state}</div>
                <div className="chips">
                  {h.specialties.split(',').map((s) => <span key={s} className="chip">{s.trim()}</span>)}
                </div>
                <div className="row-between small">
                  <span>★ {h.rating.toFixed(1)}</span>
                  <span>{h.beds} beds</span>
                  <span>{h.emergency ? '🚑 Emergency' : 'OPD only'}</span>
                </div>
              </label>
            ))}
          </div>
          {!visibleHospitals.length && <Empty text="No partner hospitals in this city yet." />}

          {compared.length >= 2 && (
            <div className="card table-wrap">
              <h3>Comparison</h3>
              <table>
                <thead>
                  <tr><th>Feature</th>{compared.map((h) => <th key={h.id}>{h.name}</th>)}</tr>
                </thead>
                <tbody>
                  <tr><td>City</td>{compared.map((h) => <td key={h.id}>{h.city}</td>)}</tr>
                  <tr><td>Rating</td>{compared.map((h) => <td key={h.id}>★ {h.rating.toFixed(1)}</td>)}</tr>
                  <tr><td>Beds</td>{compared.map((h) => <td key={h.id}>{h.beds}</td>)}</tr>
                  <tr><td>Emergency care</td>{compared.map((h) => <td key={h.id}>{h.emergency ? 'Yes' : 'No'}</td>)}</tr>
                  <tr><td>Specialties</td>{compared.map((h) => <td key={h.id}>{h.specialties}</td>)}</tr>
                  <tr><td>Phone</td>{compared.map((h) => <td key={h.id}>{h.phone}</td>)}</tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'visits' && (
        <div className="card table-wrap">
          <h3>Appointments & treatment history</h3>
          {data.visits.length ? (
            <table>
              <thead>
                <tr><th>UHT ID</th><th>Hospital</th><th>Diagnosis</th><th>Admitted</th><th>Status</th><th>Pre-auth</th><th>Bill</th></tr>
              </thead>
              <tbody>
                {data.visits.map((v) => (
                  <tr key={v.id}>
                    <td><code>{v.uhtId}</code></td>
                    <td>{hospitalName(v.hospitalId)}</td>
                    <td>{v.diagnosis}</td>
                    <td>{formatDate(v.admittedAt)}</td>
                    <td><Badge value={v.status} /></td>
                    <td><Badge value={v.preAuthStatus} /></td>
                    <td>{formatINR(v.finalBill ?? v.estimatedBill)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty text="No visits recorded yet." />}
        </div>
      )}

      {tab === 'claims' && (
        <>
          <div className="card">
            <h3>Submit a claim</h3>
            <form className="form-grid" onSubmit={submitClaim}>
              <label>Policy
                <select name="policyId" required defaultValue={data.policies[0]?.id || ''}>
                  {data.policies.map((p) => <option key={p.id} value={p.id}>{p.planName}</option>)}
                </select>
              </label>
              <label>Related visit (optional)
                <select name="visitId" defaultValue="">
                  <option value="">Not linked to a visit</option>
                  {data.visits.map((v) => <option key={v.id} value={v.id}>{v.uhtId} · {v.diagnosis}</option>)}
                </select>
              </label>
              <label>Amount (INR)<input name="amount" type="number" min="1" required /></label>
              <label className="span-2">Description<textarea name="description" rows="2" placeholder="Brief note for the insurer" /></label>
              <button className="btn btn-primary">Submit claim</button>
            </form>
          </div>

          <div className="card table-wrap">
            <h3>Claim tracking</h3>
            {data.claims.length ? (
              <table>
                <thead>
                  <tr><th>Claim</th><th>UHT ID</th><th>Claimed</th><th>Approved</th><th>Status</th><th>Flags</th></tr>
                </thead>
                <tbody>
                  {data.claims.map((c) => (
                    <tr key={c.id}>
                      <td><code>{c.claimNumber}</code><div className="muted small">{formatDate(c.createdAt)}</div></td>
                      <td><code>{c.uhtId || '—'}</code></td>
                      <td>{formatINR(c.claimedAmount)}</td>
                      <td>{c.approvedAmount ? formatINR(c.approvedAmount) : '—'}</td>
                      <td><Badge value={c.status} /></td>
                      <td>{c.fraudRisk ? <span className="badge badge-warn">Under review</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <Empty text="No claims submitted yet." />}
          </div>
        </>
      )}

      {tab === 'notifications' && (
        <div className="card">
          <div className="row-between">
            <h3>Notifications</h3>
            <button className="btn btn-ghost" onClick={markAllRead} disabled={!unread}>Mark all as read</button>
          </div>
          {data.notifications.map((n) => (
            <div key={n.id} className={`note ${n.read ? '' : 'unread'}`}>
              <strong>{n.title}</strong>
              <span className="muted small"> · {formatDateTime(n.createdAt)}</span>
              <div>{n.message}</div>
            </div>
          ))}
          {!data.notifications.length && <Empty text="No notifications yet." />}
        </div>
      )}

      {tab === 'profile' && profile && (
        <form className="card form-grid" onSubmit={saveProfile}>
          <h3 className="span-2">Personal profile</h3>
          <label>Full name<input name="fullName" defaultValue={profile.fullName} required /></label>
          <label>Phone<input name="phone" defaultValue={profile.phone || ''} /></label>
          <label>City<input name="city" defaultValue={profile.city || ''} /></label>
          <label>Blood group<input name="bloodGroup" defaultValue={profile.bloodGroup || ''} /></label>
          <label className="span-2">Address<textarea name="address" rows="2" defaultValue={profile.address || ''} /></label>
          <div className="muted small span-2">Patient code: <code>{profile.patientCode}</code> · Share this code with your hospital at admission.</div>
          <button className="btn btn-primary">Save profile</button>
        </form>
      )}

      {tab === 'assistant' && <AssistantChat />}
    </DashboardLayout>
  );
}
