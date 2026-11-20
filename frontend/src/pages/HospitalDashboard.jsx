import { useEffect, useState } from 'react';
import { api, formatDate, formatDateTime, formatINR } from '../api.js';
import DashboardLayout from '../components/Layout.jsx';
import { Badge, Empty, Notice, Stat } from '../components/ui.jsx';

const TABS = [
  { key: 'overview', label: 'Overview & Analytics', icon: '📊' },
  { key: 'admissions', label: 'Admissions & Discharge', icon: '🛏️' },
  { key: 'patients', label: 'Patient Lookup', icon: '🔍' },
  { key: 'claims', label: 'Claims & Approvals', icon: '📄' },
];

const BLANK_ADMIT = { patientCode: '', policyId: '', diagnosis: '', ward: 'General Ward', estimatedBill: '' };

export default function HospitalDashboard() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [admit, setAdmit] = useState(BLANK_ADMIT);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const load = () => api('/hospital/dashboard').then(setData).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  async function search(e) {
    e.preventDefault();
    try {
      setResults(await api(`/hospital/patients?q=${encodeURIComponent(query)}`));
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function submitAdmit(e) {
    e.preventDefault();
    try {
      const v = await api('/hospital/visits', {
        method: 'POST',
        body: {
          patientCode: admit.patientCode,
          policyId: admit.policyId ? Number(admit.policyId) : null,
          diagnosis: admit.diagnosis,
          ward: admit.ward,
          estimatedBill: admit.estimatedBill ? Number(admit.estimatedBill) : 0,
        },
      });
      setMsg(`Admitted. UHT ID ${v.uhtId} · pre-authorization: ${v.preAuthStatus.replace(/_/g, ' ').toLowerCase()}.`);
      setAdmit(BLANK_ADMIT);
      await load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function discharge(visit) {
    const input = window.prompt('Final bill amount in INR (leave empty to use the estimate):', '');
    if (input === null) return;
    try {
      await api(`/hospital/visits/${visit.id}/discharge`, {
        method: 'POST',
        body: { finalBill: input.trim() ? Number(input) : null },
      });
      setMsg(`Discharged ${visit.uhtId}. You can now submit the claim.`);
      await load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function submitClaim(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const c = await api('/hospital/claims', {
        method: 'POST',
        body: {
          visitId: Number(f.get('visitId')),
          amount: f.get('amount') ? Number(f.get('amount')) : null,
          description: f.get('description'),
        },
      });
      setMsg(`Claim ${c.claimNumber} submitted${c.fraudRisk ? ' and flagged for insurer investigation' : ''}.`);
      e.target.reset();
      await load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (!data) {
    return (
      <DashboardLayout title="Hospital dashboard" tabs={TABS} active={tab} onChange={setTab}>
        <Notice message={msg || 'Loading hospital records…'} />
      </DashboardLayout>
    );
  }

  const s = data.stats;
  const dischargedVisits = data.visits.filter((v) => v.status === 'DISCHARGED');
  const claimedVisitIds = new Set(data.claims.map((c) => c.visitId));
  const claimable = dischargedVisits.filter((v) => !claimedVisitIds.has(v.id));
  const admittedVisits = data.visits.filter((v) => v.status === 'ADMITTED');

  return (
    <DashboardLayout
      title={data.hospital.name}
      subtitle={`${data.hospital.city}, ${data.hospital.state} · Hospital operations console`}
      tabs={TABS}
      active={tab}
      onChange={setTab}
    >
      <Notice message={msg} onClose={() => setMsg('')} />

      {tab === 'overview' && (
        <>
          <div className="grid-4">
            <Stat label="Currently admitted" value={s.admitted} />
            <Stat label="Discharged" value={s.discharged} />
            <Stat label="Pending pre-auth" value={s.pendingPreAuth} tone="warn" />
            <Stat label="Total billed" value={formatINR(s.totalBilled)} tone="accent" />
          </div>
          <div className="grid-2">
            <div className="card">
              <h3>Claims pipeline</h3>
              <div className="pipeline">
                <div><strong>{s.claimsSubmitted}</strong><span>Submitted</span></div>
                <div><strong>{formatINR(s.approvedValue)}</strong><span>Approved value</span></div>
                <div><strong>{claimable.length}</strong><span>Ready to claim</span></div>
              </div>
            </div>
            <div className="card">
              <h3>Recent activity</h3>
              {data.visits.slice(0, 4).map((v) => (
                <div key={v.id} className="note">
                  <code>{v.uhtId}</code>
                  <div className="small">{v.diagnosis} · <Badge value={v.status} /> · <Badge value={v.preAuthStatus} /></div>
                </div>
              ))}
              {!data.visits.length && <Empty text="No admissions yet." />}
            </div>
          </div>
        </>
      )}

      {tab === 'admissions' && (
        <>
          <div className="grid-2">
            <form className="card form-grid" onSubmit={submitAdmit}>
              <h3 className="span-2">Admit patient</h3>
              <label>Patient code
                <input required placeholder="MB-P-000101" value={admit.patientCode}
                  onChange={(e) => setAdmit({ ...admit, patientCode: e.target.value })} />
              </label>
              <label>Ward
                <input value={admit.ward} onChange={(e) => setAdmit({ ...admit, ward: e.target.value })} />
              </label>
              <label className="span-2">Diagnosis
                <input value={admit.diagnosis} onChange={(e) => setAdmit({ ...admit, diagnosis: e.target.value })} />
              </label>
              <label>Estimated bill (INR)
                <input type="number" min="0" value={admit.estimatedBill}
                  onChange={(e) => setAdmit({ ...admit, estimatedBill: e.target.value })} />
              </label>
              <label>Policy ID (optional)
                <input type="number" value={admit.policyId} placeholder="Auto-select"
                  onChange={(e) => setAdmit({ ...admit, policyId: e.target.value })} />
              </label>
              <button className="btn btn-primary">Admit & verify coverage</button>
            </form>

            <div className="card">
              <h3>Quick tip</h3>
              <p className="muted">Look up the patient on the Patient Lookup tab to see active policies and remaining cover, then admit using their patient code.</p>
              <p className="muted small">Pre-authorization is approved automatically when the estimated bill is within remaining coverage; otherwise it goes to the insurer for review.</p>
            </div>
          </div>

          <div className="card table-wrap">
            <h3>Admissions</h3>
            {data.visits.length ? (
              <table>
                <thead>
                  <tr><th>UHT ID</th><th>Diagnosis</th><th>Admitted</th><th>Status</th><th>Pre-auth</th><th>Estimate</th><th>Final</th><th /></tr>
                </thead>
                <tbody>
                  {data.visits.map((v) => (
                    <tr key={v.id}>
                      <td><code>{v.uhtId}</code></td>
                      <td>{v.diagnosis}<div className="muted small">{v.ward}</div></td>
                      <td>{formatDateTime(v.admittedAt)}</td>
                      <td><Badge value={v.status} /></td>
                      <td><Badge value={v.preAuthStatus} /></td>
                      <td>{formatINR(v.estimatedBill)}</td>
                      <td>{v.finalBill != null ? formatINR(v.finalBill) : '—'}</td>
                      <td>
                        {v.status === 'ADMITTED' && (
                          <button className="btn btn-outline btn-sm" onClick={() => discharge(v)}>Discharge</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <Empty text="No admissions yet." />}
            {admittedVisits.length > 0 && <p className="muted small">{admittedVisits.length} patient(s) currently admitted.</p>}
          </div>
        </>
      )}

      {tab === 'patients' && (
        <>
          <form className="card toolbar" onSubmit={search}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or patient code" aria-label="Search patients" />
            <button className="btn btn-primary">Search</button>
          </form>
          <div className="grid-3">
            {results.map((r) => (
              <div key={r.patient.id} className="card">
                <strong>{r.patient.fullName}</strong>
                <div className="muted small">Code <code>{r.patient.patientCode}</code> · {r.patient.city}</div>
                {r.policies.length ? r.policies.map((p) => (
                  <div key={p.id} className="small coverage-line">
                    {p.planName}: <strong>{formatINR(p.remainingCoverage)}</strong> remaining of {formatINR(p.sumInsured)}
                  </div>
                )) : <div className="small text-danger">No active policy</div>}
                <button className="btn btn-outline btn-sm" onClick={() => { setAdmit({ ...BLANK_ADMIT, patientCode: r.patient.patientCode }); setTab('admissions'); }}>
                  Admit this patient
                </button>
              </div>
            ))}
          </div>
          {!results.length && <Empty text="Search to find a patient and check their coverage." />}
        </>
      )}

      {tab === 'claims' && (
        <>
          <form className="card form-grid" onSubmit={submitClaim}>
            <h3 className="span-2">Submit claim for a discharged visit</h3>
            <label>Visit
              <select name="visitId" required defaultValue="">
                <option value="" disabled>Select a discharged visit</option>
                {claimable.map((v) => <option key={v.id} value={v.id}>{v.uhtId} · {v.diagnosis}</option>)}
              </select>
            </label>
            <label>Claim amount (INR, optional)<input name="amount" type="number" min="1" placeholder="Use final bill" /></label>
            <label className="span-2">Notes<textarea name="description" rows="2" /></label>
            <button className="btn btn-primary" disabled={!claimable.length}>Submit claim</button>
          </form>

          <div className="card table-wrap">
            <h3>Approval tracking</h3>
            {data.claims.length ? (
              <table>
                <thead><tr><th>Claim</th><th>UHT ID</th><th>Claimed</th><th>Approved</th><th>Status</th><th>Submitted</th></tr></thead>
                <tbody>
                  {data.claims.map((c) => (
                    <tr key={c.id}>
                      <td><code>{c.claimNumber}</code></td>
                      <td><code>{c.uhtId}</code></td>
                      <td>{formatINR(c.claimedAmount)}</td>
                      <td>{c.approvedAmount ? formatINR(c.approvedAmount) : '—'}</td>
                      <td><Badge value={c.status} /></td>
                      <td>{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <Empty text="No claims submitted yet." />}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
