import { Home, Search } from 'lucide-react';
import Button from '../components/Button';

export default function NotFound() {
  return (
    <section className="not-found">
      <div className="container" style={{ maxWidth: '580px', textAlign: 'center' }}>
        <div className="not-found__art" aria-hidden="true">
          <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" width="220" height="146">
            <rect x="26" y="24" width="188" height="112" rx="18" fill="#F3EBDD" stroke="#E8DCC8" strokeWidth="2" />
            <path d="M58 58H126" stroke="#E8DCC8" strokeWidth="8" strokeLinecap="round" />
            <path d="M58 78H106" stroke="#E8DCC8" strokeWidth="8" strokeLinecap="round" />
            <path d="M58 98H90" stroke="#E8DCC8" strokeWidth="8" strokeLinecap="round" />
            <circle cx="158" cy="86" r="32" fill="#FFFDF8" stroke="#7A5C36" strokeWidth="3" />
            <path d="M181 109L202 130" stroke="#7A5C36" strokeWidth="5" strokeLinecap="round" />
            <text
              x="158"
              y="94"
              textAnchor="middle"
              fill="#3D3026"
              fontFamily="Cormorant Garamond, Georgia, serif"
              fontSize="24"
              fontWeight="600"
            >
              ?
            </text>
          </svg>
        </div>

        <span className="eyebrow">Error 404</span>
        <h1 style={{ fontSize: 'var(--text-4xl)', marginBottom: '0.75rem' }}>
          This page seems to be misplaced
        </h1>
        <p style={{ marginBottom: '2rem' }}>
          The page you are looking for does not exist or may have been moved. Return home or browse
          reported campus items below.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
          <Button to="/" variant="primary" size="lg">
            <Home size={16} aria-hidden="true" /> Back to Home
          </Button>
          <Button to="/browse" variant="secondary" size="lg">
            <Search size={16} aria-hidden="true" /> Browse Items
          </Button>
        </div>
      </div>

      <style>{`
        .not-found {
          min-height: calc(100vh - var(--navbar-height));
          padding: calc(var(--navbar-height) + 3rem) 0 4rem;
          display: flex;
          align-items: center;
          background-color: var(--cream-100);
        }

        .not-found__art {
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: center;
        }
      `}</style>
    </section>
  );
}
