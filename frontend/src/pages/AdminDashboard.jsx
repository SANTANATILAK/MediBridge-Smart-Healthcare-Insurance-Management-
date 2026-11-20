import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, formatINR } from '../api.js';
import DashboardLayout from '../components/Layout.jsx';
import { Badge, Empty, Notice, Stat } from '../components/ui.jsx';

const TABS = [
  { key: 'overview', label: 'Platform Overview', icon: '🧭' },
  { key: 'users', label: 'User Accounts & Permissions', icon: '👥' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const load = () => api('/admin/dashboard').then(setData).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  async function toggle(user) {
    try {
      await api(`/admin/users/${user.id}/toggle`, { method: 'PATCH' });
      setMsg(`${user.email} ${user.active ? 'deactivated' : 'activated'}.`);
      await load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (!data) {
    return (
      <DashboardLayout title="Super admin" tabs={TABS} active={tab} onChange={setTab}>
        <Notice message={msg || 'Loading platform data…'} />
      </DashboardLayout>
    );
  }

  const c = data.counts;
  const chart = Object.entries(data.claimsByStatus).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  const users = data.users.filter((u) => roleFilter === 'ALL' || u.role === roleFilter);

  return (
    <DashboardLayout title="Super admin console" subtitle="Platform-wide management, permissions and activity" tabs={TABS} active={tab} onChange={setTab}>
      <Notice message={msg} onClose={() => setMsg('')} />

      {tab === 'overview' && (
        <>
          <div className="grid-4">
            <Stat label="Registered users" value={c.users} />
            <Stat label="Patients" value={c.patients} />
            <Stat label="Partner hospitals" value={c.hospitals} />
            <Stat label="Insurance partners" value={c.insurers} />
          </div>
          <div className="grid-4">
            <Stat label="Policies" value={c.policies} />
            <Stat label="Hospital visits" value={c.visits} />
            <Stat label="Claims" value={c.claims} />
            <Stat label="Fraud-risk alerts" value={data.fraudAlerts} tone="warn" hint={`Claimed value ${formatINR(data.claimedValue)}`} />
          </div>
          <div className="card">
            <h3>Claims by status</h3>
            {chart.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1d6fd8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty text="No claims on the platform yet." />}
          </div>
        </>
      )}

      {tab === 'users' && (
        <div className="card table-wrap">
          <div className="row-between">
            <h3>User accounts</h3>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
              {['ALL', 'PATIENT', 'HOSPITAL', 'INSURER', 'ADMIN'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><Badge value={u.role} /></td>
                  <td>{u.active ? <span className="badge badge-success">ACTIVE</span> : <span className="badge badge-danger">DISABLED</span>}</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => toggle(u)}>
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
