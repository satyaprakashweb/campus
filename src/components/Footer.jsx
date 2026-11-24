import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, ShieldCheck, GraduationCap } from 'lucide-react';
import { SITE } from '../data/siteConfig';
import Modal from './Modal';
import Button from './Button';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  const [policyModal, setPolicyModal] = useState(null); // 'privacy' | 'terms' | null

  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer__grid">
          {/* Brand & About CampusFind */}
          <div className="footer__brand">
            <Link to="/" className="footer__logo" aria-label={`${SITE.name} — Home`}>
              <span className="footer__logo-badge">
                <img
                  src={SITE.logo.medium}
                  alt=""
                  width="52"
                  height="52"
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <span className="footer__logo-text">
                <span className="footer__logo-title">CampusFind</span>
                <span className="footer__logo-sub">Smart Lost &amp; Found Portal</span>
              </span>
            </Link>
            <p className="footer__desc">
              CampusFind is an AI-powered university lost-and-found platform for {SITE.universityShort} that combines Sentence-BERT semantic text matching, TF-IDF keyword retrieval, and CLIP visual embeddings with verified QR handover.
            </p>
            <p className="footer__uni">
              <GraduationCap size={15} aria-hidden="true" />
              <span>
                {SITE.university}, {SITE.city}
              </span>
            </p>
          </div>

          {/* Quick links & Dedicated Role Portals */}
          <div className="footer__col">
            <h2 className="footer__heading">Quick Links &amp; Portals</h2>
            <nav aria-label="Footer navigation">
              <ul className="footer__list">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/browse">Browse Items</Link></li>
                <li><Link to="/matches">AI Matches</Link></li>
                <li><Link to="/#how-it-works">How It Works</Link></li>
                <li><Link to="/about">About</Link></li>
                <li><Link to="/report">Report an Item</Link></li>
                <li><Link to="/login">Student Portal</Link></li>
                <li>
                  <Link to="/faculty/login" className="footer__icon-link">
                    <GraduationCap size={13} aria-hidden="true" /> Faculty Portal
                  </Link>
                </li>
                <li>
                  <Link to="/admin/login" className="footer__icon-link">
                    <ShieldCheck size={13} aria-hidden="true" /> Admin Portal
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Team & Policies */}
          <div className="footer__col">
            <h2 className="footer__heading">Project Team &amp; Legal</h2>
            <ul className="footer__list footer__list--plain">
              {SITE.team.map((member) => (
                <li key={member.roll}>
                  <strong>{member.name}</strong>
                  <span className="footer__meta">Roll No. {member.roll}</span>
                </li>
              ))}
              <li className="footer__meta" style={{ marginTop: '0.2rem' }}>
                {SITE.semester} · B.Tech Project
              </li>
              <li style={{ marginTop: '0.45rem' }}>
                <button
                  type="button"
                  className="footer__policy-btn"
                  onClick={() => setPolicyModal('privacy')}
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer__policy-btn"
                  onClick={() => setPolicyModal('terms')}
                >
                  Terms and Conditions
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer__col">
            <h2 className="footer__heading">Contact Information</h2>
            <ul className="footer__list footer__list--plain">
              <li className="footer__contact-item">
                <Mail size={15} aria-hidden="true" />
                <a href={`mailto:${SITE.contactEmail}`} className="footer__email">
                  {SITE.contactEmail}
                </a>
              </li>
              <li className="footer__contact-item">
                <MapPin size={15} aria-hidden="true" />
                <span>{SITE.office}</span>
              </li>
            </ul>
          </div>
        </div>

        <hr className="footer__divider" />

        <div className="footer__bottom">
          <p className="footer__copyright">
            © {CURRENT_YEAR} CampusFind — {SITE.name} · {SITE.universityShort}, {SITE.city}. All rights reserved.
          </p>
          <p className="footer__tech">
            React · Node.js / FastAPI · PostgreSQL / SQLite · Sentence-BERT · TF-IDF · OpenCLIP ViT-B/32
          </p>
        </div>
      </div>

      {/* Privacy Policy & Terms and Conditions Modal */}
      <Modal
        isOpen={Boolean(policyModal)}
        onClose={() => setPolicyModal(null)}
        title={
          policyModal === 'privacy'
            ? 'CampusFind Institutional Privacy Policy'
            : 'CampusFind Terms and Conditions of Use'
        }
        footer={
          <Button variant="primary" onClick={() => setPolicyModal(null)}>
            Acknowledge &amp; Close
          </Button>
        }
      >
        {policyModal === 'privacy' ? (
          <div style={{ fontSize: 'var(--text-sm)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p>
              <strong>1. Claimant &amp; Reporter Privacy Protection:</strong> CampusFind never exposes
              private student or employee ID numbers, phone numbers, email addresses, or submitted
              ownership proof on public item detail pages.
            </p>
            <p>
              <strong>2. Image &amp; Text Processing:</strong> Uploaded item photographs and
              descriptions are processed strictly to compute CLIP ViT-B/32 visual embeddings and
              Sentence-BERT / TF-IDF similarity vectors for campus item recovery.
            </p>
            <p>
              <strong>3. Administrative Access:</strong> Ownership evidence and handover ID checks are
              accessible solely to authorized Student Services Office administrators at{' '}
              {SITE.university}.
            </p>
          </div>
        ) : (
          <div style={{ fontSize: 'var(--text-sm)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p>
              <strong>1. Accurate Campus Reporting:</strong> Users agree to submit truthful lost and
              found reports occurring within {SITE.university} premises.
            </p>
            <p>
              <strong>2. Ownership Claim Verification:</strong> Submitting a false ownership claim is a
              violation of university conduct rules. All approved claims require physical campus ID
              presentation and QR token verification at the Student Services Office prior to handover.
            </p>
            <p>
              <strong>3. AI Similarity Disclaimer:</strong> AI similarity percentages indicate multimodal
              visual and semantic alignment and do not constitute automatic proof of ownership without
              administrative verification.
            </p>
          </div>
        )}
      </Modal>

      <style>{`
        .footer {
          background-color: #3D3228;
          color: #EDE4D8;
          padding: clamp(3rem, 6vw, 4.5rem) 0 calc(1.75rem + env(safe-area-inset-bottom));
        }

        .footer a {
          color: #E8DDCC;
          transition: color var(--transition-fast);
        }

        .footer a:hover {
          color: var(--cream-50);
        }

        .footer__policy-btn {
          border: none;
          background: transparent;
          color: #E8DDCC;
          font-size: var(--text-sm);
          padding: 0;
          cursor: pointer;
          text-decoration: underline;
          text-decoration-color: rgba(232, 221, 204, 0.35);
          text-underline-offset: 3px;
        }

        .footer__policy-btn:hover {
          color: var(--cream-50);
        }

        .footer__grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2.25rem;
        }

        @media (min-width: 640px) {
          .footer__grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .footer__brand {
            grid-column: 1 / -1;
          }
        }

        @media (min-width: 1024px) {
          .footer__grid {
            grid-template-columns: 1.45fr 0.95fr 1fr 1.15fr;
            gap: 2.5rem;
          }
          .footer__brand {
            grid-column: auto;
          }
        }

        .footer__logo {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .footer__logo-badge {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background-color: var(--cream-50);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
        }

        .footer__logo-badge img {
          width: 52px;
          height: 52px;
          object-fit: contain;
        }

        .footer__logo-text {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }

        .footer__logo-title {
          font-family: var(--font-serif);
          font-size: 1.35rem;
          font-weight: 600;
          color: var(--cream-50);
        }

        .footer__logo-sub {
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #C4A484;
        }

        .footer__desc {
          font-size: var(--text-sm);
          color: #D8CBB8;
          line-height: 1.65;
          max-width: 390px;
          margin-bottom: 0.9rem;
        }

        .footer__uni {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: var(--text-sm);
          color: var(--cream-50);
          font-weight: 500;
        }

        .footer__uni svg {
          color: #A67C52;
          flex-shrink: 0;
          margin-top: 0.2rem;
        }

        .footer__heading {
          font-family: var(--font-sans);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--cream-50);
          margin-bottom: 1rem;
        }

        .footer__list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .footer__list a {
          font-size: var(--text-sm);
          display: inline-flex;
          align-items: center;
          min-height: 34px;
        }

        .footer__icon-link {
          gap: 0.35rem;
        }

        .footer__list--plain {
          gap: 0.55rem;
        }

        .footer__list--plain li {
          font-size: var(--text-sm);
          color: #D8CBB8;
        }

        .footer__list--plain strong {
          display: block;
          color: var(--cream-50);
          font-weight: 600;
        }

        .footer__meta {
          font-size: var(--text-xs);
          color: #C9B9A3;
        }

        .footer__contact-item {
          display: flex;
          align-items: flex-start;
          gap: 0.55rem;
        }

        .footer__contact-item svg {
          flex-shrink: 0;
          margin-top: 0.25rem;
          color: #A67C52;
        }

        .footer__email {
          word-break: break-all;
          min-height: 0 !important;
          text-decoration: underline;
          text-decoration-color: rgba(232, 221, 204, 0.35);
          text-underline-offset: 3px;
        }

        .footer__divider {
          border: none;
          height: 1px;
          background-color: rgba(232, 220, 200, 0.18);
          margin: 2.5rem 0 1.25rem;
        }

        .footer__bottom {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          text-align: center;
        }

        @media (min-width: 768px) {
          .footer__bottom {
            flex-direction: row;
            justify-content: space-between;
            text-align: left;
          }
        }

        .footer__copyright,
        .footer__tech {
          font-size: var(--text-xs);
          color: #CFC0AB;
          margin: 0;
        }
      `}</style>
    </footer>
  );
}
