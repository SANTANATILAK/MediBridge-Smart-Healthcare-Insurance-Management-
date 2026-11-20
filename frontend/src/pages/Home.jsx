import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, formatINR } from '../api.js';
import { Badge, Logo, Notice } from '../components/ui.jsx';

const SERVICES = [
  { icon: '🪪', title: 'Universal Healthcare ID', text: 'One transaction ID per hospital visit that connects admission, billing, documents and claims.' },
  { icon: '⚡', title: 'Cashless pre-authorization', text: 'Hospitals check coverage instantly, and insurers review only what needs a human decision.' },
  { icon: '🧾', title: 'Claim readiness checks', text: 'AI spots missing documents before submission, so claims move faster the first time.' },
  { icon: '🛡️', title: 'Fraud-risk screening', text: 'Rule-based alerts flag unusual claims for investigators. Nothing is rejected automatically.' },
  { icon: '🏥', title: 'Network hospital finder', text: 'Search partner hospitals by city and compare ratings, beds and specialties side by side.' },
  { icon: '🔔', title: 'Real-time updates', text: 'Patients, hospitals and insurers see status changes as they happen.' },
];

const STEPS = [
  { title: 'Admit & verify', text: 'The hospital admits the patient with their card ID. Coverage is verified and a UHT ID is issued.' },
  { title: 'Pre-authorize', text: 'Estimated treatment cost is checked against remaining coverage. Approved amounts are reserved instantly.' },
  { title: 'Treat & document', text: 'Bills, reports and discharge summaries are attached to the same transaction ID.' },
  { title: 'Claim & settle', text: 'The claim is submitted, screened, reviewed and settled. Patients track every step.' },
];

const TESTIMONIALS = [
  { quote: 'The cashless approval came through before I even reached the ward. Everything was on one screen.', name: 'Rahul S.', role: 'Patient (sample testimonial)' },
  { quote: 'We stopped chasing paper. Every document is linked to the visit, so our billing team closes faster.', name: 'Billing Lead', role: 'Hospital partner (sample testimonial)' },
  { quote: 'Fraud-risk alerts help our investigators focus on the claims that need them most.', name: 'Claims Manager', role: 'Insurance partner (sample testimonial)' },
];

const FAQS = [
  ['What is a Universal Healthcare Transaction ID?', 'It is a unique ID created for every hospital visit. It connects admission, insurance verification, pre-authorization, treatment records, bills, claims and settlement so the whole journey can be traced.'],
  ['Is MediBridge free for patients?', 'Yes. Patients use the portal at no cost. Hospitals and insurers join through a partnership agreement.'],
  ['Who makes the final claim decision?', 'The insurer does. AI and rules only help with checks, summaries and alerts. Fraud alerts are routed to human investigators.'],
  ['How is my data protected?', 'Passwords are hashed, every API call requires a role-scoped token, and each portal only sees its own records.'],
  ['Can I track a visit without logging in?', 'Yes. Enter your UHT ID in the tracker on this page to see the current status of the visit and its claims.'],
];

export default function Home() {
  const [hospitals, setHospitals] = useState([]);
  const [insurers, setInsurers] = useState([]);
  const [uhtId, setUhtId] = useState('');
  const [track, setTrack] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [contact, setContact] = useState({ name: '', email: '', message: '' });
  const [contactNote, setContactNote] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api('/public/hospitals').then(setHospitals).catch(() => {});
    api('/public/insurers').then(setInsurers).catch(() => {});
  }, []);

  async function trackVisit(e) {
    e.preventDefault();
    setTrack(null);
    setTrackError('');
    try {
      setTrack(await api(`/public/track/${encodeURIComponent(uhtId.trim())}`));
    } catch (err) {
      setTrackError(err.message);
    }
  }

  async function sendContact(e) {
    e.preventDefault();
    try {
      const res = await api('/public/contact', { method: 'POST', body: contact });
      setContactNote(res.message);
      setContact({ name: '', email: '', message: '' });
    } catch (err) {
      setContactNote(err.message);
    }
  }

  return (
    <div className="home">
      <header className="topbar">
        <div className="container topbar-inner">
          <a href="#top" className="brand"><Logo /></a>
          <button className="menu-toggle" aria-label="Toggle menu" onClick={() => setMenuOpen((o) => !o)}>☰</button>
          <nav className={`nav-links ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)}>
            <a href="#services">Services</a>
            <a href="#how">How it works</a>
            <a href="#partners">Partners</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="portal-buttons">
            <Link to="/login?portal=patient" className="btn btn-ghost">Patient</Link>
            <Link to="/login?portal=hospital" className="btn btn-ghost">Hospital</Link>
            <Link to="/login?portal=insurer" className="btn btn-ghost">Insurer</Link>
            <Link to="/login?portal=admin" className="btn btn-primary">Admin</Link>
          </div>
        </div>
      </header>

      <section id="top" className="hero">
        <div className="container hero-grid">
          <div className="fade-in">
            <span className="eyebrow">AI-powered healthcare coordination</span>
            <h1>Healthcare coordination that is transparent, faster and easier.</h1>
            <p className="lead">
              MediBridge connects patients, hospitals and insurers through one platform, so admissions, approvals,
              bills and claims move in sync instead of through phone calls and paper files.
            </p>
            <div className="hero-cta">
              <Link to="/login?portal=patient" className="btn btn-primary btn-lg">Open patient portal</Link>
              <a href="#how" className="btn btn-outline btn-lg">See how it works</a>
            </div>
            <div className="hero-points">
              <span>✔ Role-based portals</span>
              <span>✔ Real-time notifications</span>
              <span>✔ Encrypted passwords</span>
            </div>
          </div>

          <div className="card track-card fade-in">
            <h3>Track a visit with your UHT ID</h3>
            <p className="muted">Enter the Universal Healthcare Transaction ID from your admission slip.</p>
            <form onSubmit={trackVisit} className="track-form">
              <input
                value={uhtId}
                onChange={(e) => setUhtId(e.target.value)}
                placeholder="UHT-20261120-XXXXXXXX"
                aria-label="UHT ID"
              />
              <button className="btn btn-primary">Track</button>
            </form>
            {trackError && <Notice message={trackError} />}
            {track && (
              <div className="track-result">
                <div className="track-row"><span>Hospital</span><strong>{track.hospital}</strong></div>
                <div className="track-row"><span>Status</span><Badge value={track.status} /></div>
                <div className="track-row"><span>Pre-authorization</span><Badge value={track.preAuthStatus} /></div>
                <div className="track-row"><span>Admitted</span><strong>{formatDate(track.admittedAt)}</strong></div>
                <div className="track-row"><span>Estimated bill</span><strong>{formatINR(track.estimatedBill)}</strong></div>
                <div className="track-row">
                  <span>Claims</span>
                  <strong>{track.claims.length ? track.claims.map((c) => `${c.claimNumber} (${c.status.toLowerCase().replace('_', ' ')})`).join(', ') : 'None yet'}</strong>
                </div>
              </div>
            )}
            <p className="muted small">Your UHT ID appears on your admission slip and on your patient dashboard. Demo visits are already loaded.</p>
          </div>
        </div>
      </section>

      <section className="stats-strip">
        <div className="container stats-grid">
          <div><strong>4</strong><span>Role-based portals</span></div>
          <div><strong>1</strong><span>Transaction ID per visit</span></div>
          <div><strong>6</strong><span>Claim stages tracked</span></div>
          <div><strong>24/7</strong><span>Online access</span></div>
        </div>
      </section>

      <section id="services" className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Services</span>
            <h2>Everything the care journey needs</h2>
            <p className="muted">Built for patients, hospitals, insurers and platform administrators.</p>
          </div>
          <div className="grid-3">
            {SERVICES.map((s) => (
              <div key={s.title} className="card service-card">
                <div className="service-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p className="muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="section section-alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">How it works</span>
            <h2>From admission to settlement in four steps</h2>
          </div>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card step">
                <span className="step-num">{i + 1}</span>
                <h3>{s.title}</h3>
                <p className="muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="partners" className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Partners</span>
            <h2>Partner hospitals and insurance companies</h2>
          </div>
          <div className="grid-2">
            <div>
              <h3 className="sub-head">Hospitals</h3>
              <div className="partner-list">
                {hospitals.map((h) => (
                  <div key={h.id} className="card partner">
                    <div>
                      <strong>{h.name}</strong>
                      <div className="muted small">{h.city}, {h.state} · {h.beds} beds</div>
                    </div>
                    <span className="rating">★ {h.rating.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="sub-head">Insurance partners</h3>
              <div className="partner-list">
                {insurers.map((i) => (
                  <div key={i.id} className="card partner">
                    <div>
                      <strong>{i.name}</strong>
                      <div className="muted small">Claim settlement ratio {i.claimSettlementRatio}%</div>
                    </div>
                    <span className="rating">★ {i.rating.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Testimonials</span>
            <h2>What people say</h2>
          </div>
          <div className="grid-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="card testimonial">
                <blockquote>“{t.quote}”</blockquote>
                <figcaption><strong>{t.name}</strong><span className="muted small"> · {t.role}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="section">
        <div className="container narrow">
          <div className="section-head">
            <span className="eyebrow">FAQ</span>
            <h2>Frequently asked questions</h2>
          </div>
          {FAQS.map(([q, a]) => (
            <details key={q} className="card faq">
              <summary>{q}</summary>
              <p className="muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="contact" className="section section-alt">
        <div className="container contact-grid">
          <div>
            <span className="eyebrow">Contact</span>
            <h2>Talk to our team</h2>
            <p className="muted">Hospitals and insurers can request onboarding. Patients can reach support here.</p>
            <ul className="contact-list">
              <li>📍 MediBridge Health Technologies, Bhubaneswar, Odisha</li>
              <li>📧 support@medibridge.in</li>
              <li>📞 +91 1800 000 000 (toll free)</li>
            </ul>
          </div>
          <form className="card contact-form" onSubmit={sendContact}>
            <input required placeholder="Full name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            <input required type="email" placeholder="Email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            <textarea required rows="4" placeholder="How can we help?" value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} />
            <button className="btn btn-primary">Send message</button>
            <Notice message={contactNote} onClose={() => setContactNote('')} />
          </form>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <Logo light />
          <span>© {new Date().getFullYear()} MediBridge. Demo platform for coordination and education.</span>
        </div>
      </footer>
    </div>
  );
}
