import {
  CheckCircle2,
  Code2,
  Server,
  Database,
  Cpu,
  GraduationCap,
  Building2,
  Mail,
  MapPin,
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { SITE } from '../data/siteConfig';

const OBJECTIVES = [
  'Design a secure multi-role web portal with role-based access for students, staff, and administrators.',
  'Implement automatic item matching comparing opposite-type reports via TF-IDF cosine similarity (baseline) and pre-trained Sentence-BERT, combined with category, location, and time filters.',
  'Provide a structured claim submission, administrative verification, and recorded digital handover workflow.',
  'Build an administrative dashboard to manage reported items, verify claims, record handovers, and oversee campus user roles.',
  'Evaluate the matching approaches on a campus-style dataset using precision at top-k, recall, and mean reciprocal rank (results to be reported only after testing).',
];

const TECH_STACK = [
  {
    icon: Code2,
    layer: 'Frontend',
    name: 'React + Vite',
    detail: 'Responsive component-driven portal with React Router, lazy-loaded routes, and accessible beige-and-cream design tokens.',
  },
  {
    icon: Server,
    layer: 'Backend API',
    name: 'Node.js or FastAPI',
    detail: 'RESTful service layer handling authentication, role guards, item reports, claim verification, and handover logging.',
  },
  {
    icon: Database,
    layer: 'Data Storage',
    name: 'MySQL or PostgreSQL',
    detail: 'Relational persistence for user accounts, lost/found listings, match rankings, claim records, and audit trails.',
  },
  {
    icon: Cpu,
    layer: 'Matching Module',
    name: 'Python · scikit-learn & sentence-transformers',
    detail: 'TF-IDF vectorization with cosine similarity as baseline alongside pre-trained Sentence-BERT embeddings.',
  },
];

export default function About() {
  const revealRef = useScrollReveal();

  return (
    <div ref={revealRef}>
      <section className="page-header">
        <div className="container about-header">
          <div>
            <span className="eyebrow">Academic Project Overview</span>
            <h1>About the Smart Campus Lost &amp; Found Portal</h1>
            <p className="page-header__lead">
              A unified web application for {SITE.university}, {SITE.city}, combining semantic item
              matching with administrative claim verification and recorded handover.
            </p>
          </div>
          <div className="about-header__logo" aria-hidden="true">
            <img src={SITE.logo.large} alt="" width="220" height="220" decoding="async" />
          </div>
        </div>
      </section>

      {/* Abstract Summary */}
      <section className="section">
        <div className="container container--narrow">
          <div className="fade-up">
            <span className="eyebrow">Project Abstract</span>
            <h2 style={{ fontSize: 'var(--text-3xl)', marginBottom: '1.25rem' }}>
              Bridging semantic matching with a complete campus return workflow
            </h2>
            <Card>
              <p>
                The loss of personal belongings such as identity cards, mobile phones, books, keys,
                and bags is a frequent problem on university campuses. In most institutions, lost and
                found items are still handled through notice boards, messaging groups, or a physical
                office counter, which leaves reports scattered, hard to search, and slow to reach the
                right person.
              </p>
              <p>
                Recent research on digital lost-and-found systems indicates that keyword search alone
                is insufficient, and that matching item descriptions semantically—alongside category,
                location, and time context—produces more useful candidates than simple filtering.
                However, prior work often focuses narrowly on the matching model while giving limited
                attention to the full campus workflow: claim submission, administrative verification,
                and recorded handover.
              </p>
              <p>
                This project addresses that gap by delivering a unified, role-based portal where
                students, staff, and administrators can report items, inspect ranked likely matches,
                verify ownership through identifying details, and log completed returns. Matching
                methods (TF-IDF cosine baseline and Sentence-BERT) will be evaluated on a campus-style
                dataset using precision at top-k, recall, and mean reciprocal rank; performance figures
                will be reported only after testing.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Objectives */}
      <section className="section section--sand">
        <div className="container container--narrow">
          <div className="fade-up">
            <span className="eyebrow">Project Objectives</span>
            <h2 style={{ fontSize: 'var(--text-3xl)', marginBottom: '1.5rem' }}>
              Core goals guiding design and evaluation
            </h2>
            <Card>
              <ol className="about-objectives">
                {OBJECTIVES.map((obj, idx) => (
                  <li key={idx} className="about-objectives__item">
                    <CheckCircle2 size={19} className="about-objectives__icon" aria-hidden="true" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="section">
        <div className="container">
          <div className="fade-up" style={{ marginBottom: '2rem', maxWidth: '640px' }}>
            <span className="eyebrow">Architecture &amp; Stack</span>
            <h2 style={{ fontSize: 'var(--text-3xl)' }}>Technology stack</h2>
          </div>

          <div className="grid grid--2">
            {TECH_STACK.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.layer} hover className="fade-up">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--sand-200)',
                        border: '1px solid var(--sand-300)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--bronze-700)',
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: 'var(--bronze-700)',
                        }}
                      >
                        {item.layer}
                      </span>
                      <h3 style={{ fontSize: 'var(--text-xl)' }}>{item.name}</h3>
                    </div>
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)' }}>{item.detail}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Project Team & Institution */}
      <section className="section section--sand">
        <div className="container">
          <div className="fade-up" style={{ marginBottom: '2rem' }}>
            <span className="eyebrow">Project Credits</span>
            <h2 style={{ fontSize: 'var(--text-3xl)' }}>Team and institution</h2>
          </div>

          <div className="about-credits">
            <Card className="fade-up">
              <div className="about-team-icon" aria-hidden="true">
                <GraduationCap size={20} />
              </div>
              <span className="about-team-role">Project Team · {SITE.semester}</span>
              <ul className="about-team-list">
                {SITE.team.map((member) => (
                  <li key={member.roll} className="about-team-member">
                    <span className="about-team-avatar" aria-hidden="true">
                      {member.name
                        .split(' ')
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <span>
                      <strong>{member.name}</strong>
                      <span className="about-team-roll">Roll No. {member.roll}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="fade-up about-institution">
              <div className="about-institution__logo">
                <img
                  src={SITE.logo.medium}
                  alt={SITE.logo.alt}
                  width="96"
                  height="96"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div>
                <span className="about-team-role">
                  <Building2 size={13} aria-hidden="true" style={{ verticalAlign: '-2px' }} />{' '}
                  Institution
                </span>
                <h3 style={{ fontSize: 'var(--text-2xl)', marginBottom: '0.35rem' }}>
                  {SITE.university}
                </h3>
                <p style={{ fontSize: 'var(--text-sm)', marginBottom: '1rem' }}>
                  {SITE.universityShort}, {SITE.city}, Odisha
                </p>
                <ul className="about-contact">
                  <li>
                    <Mail size={15} aria-hidden="true" />
                    <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
                  </li>
                  <li>
                    <MapPin size={15} aria-hidden="true" />
                    <span>{SITE.office}</span>
                  </li>
                </ul>
                <Button to="/browse" variant="secondary" size="sm" style={{ marginTop: '1.1rem' }}>
                  Explore the Portal
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <style>{`
        .about-header {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          align-items: center;
        }

        .about-header__logo {
          display: none;
        }

        @media (min-width: 900px) {
          .about-header {
            grid-template-columns: 1fr auto;
            gap: 3rem;
          }
          .about-header__logo {
            display: flex;
            width: 200px;
            height: 200px;
            border-radius: 50%;
            background-color: var(--cream-50);
            border: 1px solid var(--sand-300);
            box-shadow: var(--shadow-lg);
            align-items: center;
            justify-content: center;
          }
          .about-header__logo img {
            width: 170px;
            height: 170px;
            object-fit: contain;
          }
        }

        .about-credits {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 900px) {
          .about-credits {
            grid-template-columns: 0.9fr 1.1fr;
          }
        }

        .about-team-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 0.75rem;
        }

        .about-team-member {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          padding: 0.9rem 1rem;
          background-color: var(--cream-100);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
        }

        .about-team-member strong {
          display: block;
          font-family: var(--font-serif);
          font-size: var(--text-xl);
          font-weight: 600;
          color: var(--mocha-900);
          line-height: 1.2;
        }

        .about-team-avatar {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background-color: var(--mocha-900);
          color: var(--cream-50);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: var(--text-sm);
          letter-spacing: 0.04em;
          flex-shrink: 0;
        }

        .about-team-roll {
          font-size: var(--text-xs);
          color: var(--mocha-600);
        }

        .about-institution {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        @media (min-width: 560px) {
          .about-institution {
            flex-direction: row;
            align-items: flex-start;
          }
        }

        .about-institution__logo {
          width: 112px;
          height: 112px;
          border-radius: 24px;
          background-color: var(--cream-100);
          border: 1px solid var(--sand-300);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .about-institution__logo img {
          width: 96px;
          height: 96px;
          object-fit: contain;
        }

        .about-contact {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          font-size: var(--text-sm);
        }

        .about-contact li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          color: var(--mocha-900);
        }

        .about-contact svg {
          color: var(--bronze-700);
          flex-shrink: 0;
          margin-top: 0.2rem;
        }

        .about-contact a {
          word-break: break-all;
          font-weight: 500;
        }

        .about-objectives {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .about-objectives__item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          color: var(--mocha-900);
          font-size: var(--text-base);
        }

        .about-objectives__icon {
          flex-shrink: 0;
          margin-top: 0.2rem;
          color: var(--bronze-700);
        }

        .about-team-icon {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-md);
          background-color: var(--sand-200);
          border: 1px solid var(--sand-300);
          color: var(--bronze-700);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.85rem;
        }

        .about-team-role {
          display: block;
          font-size: var(--text-xs);
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--bronze-700);
          margin-bottom: 0.4rem;
        }
      `}</style>
    </div>
  );
}
