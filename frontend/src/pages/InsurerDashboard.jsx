import { useEffect, useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { api, formatDate, formatINR } from '../api.js';
import DashboardLayout from '../components/Layout.jsx';
import { Badge, Empty, Notice, Stat } from '../components/ui.jsx';

const TABS = [
  { key: 'overview', label: 'Performance', icon: '📈' },
  { key: 'queue', label: 'Claims Queue', icon: '📥' },
  { key: 'fraud', label: 'Fraud-Risk Alerts', icon: '🚨' },
];

const COLORS = ['#1d6fd8', '#5aa2f5', '#f5a524', '#12a150', '#e5484d', '#8e9bb3'];
const OPEN = ['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED'];

export default function InsurerDashboard() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [amounts, setAmounts] = useState({});
  const [notes, setNotes] = useState({});

  const load = () => api('/insurer/dashboard').then(setData).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  async function decide(claim, decision) {
    try {
      const body = {
        decision,
        approvedAmount: decision === 'APPROVE' ? Number(amounts[claim.id] ?? claim.claimedAmount) : null,
        note: notes[claim.id] || null,
      };
      const updated = await api(`/insurer/claims/${claim.id}/decision`, { method: 'POST', body });
      setMsg(`${updated.claimNumber} is now ${updated.status.replace(/_/g, ' ').toLowerCase()}.`);
      await load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (!data) {
    return (
      <DashboardLayout title="Insurance dashboard" tabs={TABS} active={tab} onChange={setTab}>
        <Notice message={msg || 'Loading claims…'} />
      </DashboardLayout>
    );
  }

  const s = data.stats;
  const statusData = Object.entries(s.byStatus).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  const queue = data.claims.filter((c) => OPEN.includes(c.status));
  const alerts = data.claims.filter((c) => c.fraudRisk && c.status !== 'SETTLED' && c.status !== 'REJECTED');

  return (
    <DashboardLayout
      title={data.insurer.name}
      subtitle="Claims operations, policy verification and performance analytics"
      tabs={TABS.map((t) => (t.key === 'fraud' && alerts.length ? { ...t, label: `Fraud-Risk Alerts (${alerts.length})` } : t))}
      active={tab}
      onChange={setTab}
    >
      <Notice message={msg} onClose={() => setMsg('')} />

      {tab === 'overview' && (
        <>
          <div className="grid-4">
            <Stat label="Total claims" value={s.total} />
            <Stat label="Pending decisions" value={s.pending} tone="warn" />
            <Stat label="Claimed value" value={formatINR(s.claimedValue)} />
            <Stat label="Settled value" value={formatINR(s.settledValue)} tone="accent" hint={`Settlement ratio ${s.settlementRatio}%`} />
          </div>
          <div className="grid-2">
            <div className="card">
              <h3>Claims by status</h3>
              {statusData.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Empty text="No claims yet." />}
            </div>
            <div className="card">
              <h3>Service level</h3>
              <p className="muted">Open claims awaiting action: <strong>{s.pending}</strong></p>
              <p className="muted">Fraud-risk alerts for human investigation: <strong>{s.fraudAlerts}</strong></p>
              <p className="muted small">Fraud alerts are rule-based flags. Investigators make the final call and claims are never rejected automatically.</p>
            </div>
          </div>
        </>
      )}

      {tab === 'queue' && (
        <div className="card table-wrap">
          <h3>Incoming claims</h3>
          {queue.length ? (
            <table>
              <thead>
                <tr><th>Claim</th><th>UHT ID</th><th>Claimed</th><th>Status</th><th>Decision</th></tr>
              </thead>
              <tbody>
                {queue.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <code>{c.claimNumber}</code>
                      <div className="muted small">{formatDate(c.createdAt)}</div>
                      {c.description && <div className="small">{c.description}</div>}
                    </td>
                    <td><code>{c.uhtId || '—'}</code></td>
                    <td>{formatINR(c.claimedAmount)}{c.fraudRisk && <div className="badge badge-warn mt">Flagged</div>}</td>
                    <td><Badge value={c.status} /></td>
                    <td className="decision-cell">
                      <input
                        type="number"
                        min="0"
                        aria-label="Approved amount"
                        placeholder="Approved ₹"
                        value={amounts[c.id] ?? ''}
                        onChange={(e) => setAmounts({ ...amounts, [c.id]: e.target.value })}
                      />
                      <input
                        aria-label="Note"
                        placeholder="Note to patient/hospital"
                        value={notes[c.id] ?? ''}
                        onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })}
                      />
                      <div className="btn-row">
                        <button className="btn btn-success btn-sm" onClick={() => decide(c, 'APPROVE')}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => decide(c, 'REJECT')}>Reject</button>
                        <button className="btn btn-outline btn-sm" onClick={() => decide(c, 'REQUEST_INFO')}>Request info</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty text="The queue is clear." />}

          <h3 className="mt-lg">Approved claims ready to settle</h3>
          {data.claims.filter((c) => c.status === 'APPROVED').map((c) => (
            <div key={c.id} className="row-between note">
              <span><code>{c.claimNumber}</code> · approved {formatINR(c.approvedAmount)}</span>
              <button className="btn btn-primary btn-sm" onClick={() => decide(c, 'SETTLE')}>Settle</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'fraud' && (
        <div className="card">
          <h3>Fraud-risk alerts</h3>
          <p className="muted small">Flags come from rules: amount above remaining coverage, duplicate visit claims and high-value claims.</p>
          {alerts.length ? alerts.map((c) => (
            <div key={c.id} className="alert-card">
              <div className="row-between">
                <strong><code>{c.claimNumber}</code> · {formatINR(c.claimedAmount)}</strong>
                <Badge value={c.status} />
              </div>
              <div className="small">{c.fraudReason}</div>
              <div className="muted small">UHT ID {c.uhtId || '—'} · Submitted {formatDate(c.createdAt)}</div>
            </div>
          )) : <Empty text="No open fraud-risk alerts." />}
        </div>
      )}
    </DashboardLayout>
  );
}
