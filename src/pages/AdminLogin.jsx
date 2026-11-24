import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortalData } from '../context/PortalDataContext';
import { SITE } from '../data/siteConfig';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const { showToast } = usePortalData();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!email.trim() || !email.includes('@')) {
      nextErrors.email = 'Please enter a valid administrator email.';
    }
    if (!password || password.length < 4) {
      nextErrors.password = 'Please enter your administrator password.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setServerError('');
      await adminLogin(email.trim(), password);
      showToast('Signed in to Administrator Control Panel.');
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Invalid administrator credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="admin-auth-shell">
      <div className="container" style={{ maxWidth: '470px' }}>
        <Card className="admin-auth-card">
          <div className="admin-auth-card__head">
            <img
              src={SITE.logo.medium}
              alt={SITE.logo.alt}
              width="76"
              height="76"
              className="auth-logo"
              decoding="async"
            />
            <span className="eyebrow">Restricted Portal · {SITE.universityShort}</span>
            <h1>Administrator Login</h1>
            <p className="admin-auth-card__sub">
              Sign in to verify submitted claims, schedule handovers, configure AI thresholds, and
              manage campus accounts.
            </p>
          </div>

          {serverError && (
            <div className="alert alert--danger" role="alert" style={{ marginBottom: '1.15rem' }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Input
              id="admin-email"
              label="Administrator Email"
              type="email"
              required
              placeholder="admin@university.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: '' }));
                setServerError('');
              }}
              error={errors.email}
              autoComplete="email"
            />

            <div className="form-group">
              <label htmlFor="admin-password" className="form-label form-label--required">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                  style={{ paddingRight: '3rem' }}
                  placeholder="Enter administrator password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: '' }));
                    setServerError('');
                  }}
                  aria-invalid={Boolean(errors.password)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="admin-pw-toggle"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="form-error" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Verifying...' : 'Sign In to Admin Dashboard'}
            </Button>
          </form>

          <div className="admin-demo">
            <p className="admin-demo__title">One-Click Evaluation Access</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              fullWidth
              disabled={isSubmitting}
              onClick={async () => {
                try {
                  setIsSubmitting(true);
                  await adminLogin('admin@university.edu', 'admin123');
                  showToast('Signed in as OUTR Campus Administrator.');
                  navigate('/admin', { replace: true });
                } catch (err) {
                  setServerError(err.message || 'Demo admin login failed.');
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              Sign In as Demo Administrator
            </Button>
          </div>

          <hr className="divider" />

          <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', margin: 0 }}>
            Student, Faculty, or Staff? <Link to="/login"><strong>Use Campus Login</strong></Link>
          </p>
        </Card>
      </div>

      <style>{`
        .admin-auth-shell {
          padding-top: calc(var(--navbar-height) + 2.5rem);
          padding-bottom: 4rem;
          background-color: var(--sand-200);
          min-height: calc(100vh - var(--navbar-height));
          display: flex;
          align-items: center;
        }

        .admin-auth-card {
          padding: clamp(1.5rem, 4vw, 2.5rem);
          box-shadow: var(--shadow-lg);
        }

        .admin-auth-card__head {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .admin-auth-card__head h1 {
          font-size: var(--text-3xl);
          margin-bottom: 0.45rem;
        }

        .admin-auth-card__sub {
          font-size: var(--text-sm);
          color: var(--mocha-600);
        }

        .admin-pw-toggle {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          color: var(--mocha-600);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .admin-demo {
          margin-top: 1.25rem;
          padding: 0.9rem;
          background-color: var(--cream-100);
          border: 1px dashed var(--taupe-500);
          border-radius: var(--radius-md);
        }

        .admin-demo__title {
          font-size: var(--text-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--bronze-700);
          margin-bottom: 0.6rem;
          text-align: center;
        }
      `}</style>
    </section>
  );
}
