import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortalData } from '../context/PortalDataContext';
import { getDashboardPathForRole } from '../components/RouteGuards';
import { SITE } from '../data/siteConfig';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';

export default function Login() {
  const { login } = useAuth();
  const { showToast } = usePortalData();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from?.pathname;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolveRedirectTarget = (role) => {
    const roleDefault = getDashboardPathForRole(role);
    if (!fromPath || fromPath === '/dashboard' || fromPath === '/login') {
      return roleDefault;
    }
    if (fromPath.startsWith('/admin') && role !== 'admin') return roleDefault;
    if (fromPath.startsWith('/faculty') && role !== 'faculty' && role !== 'staff') return roleDefault;
    return fromPath;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!email.trim() || !email.includes('@')) {
      nextErrors.email = 'Please enter a valid campus email address.';
    }
    if (!password || password.length < 4) {
      nextErrors.password = 'Please enter your password.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setServerError('');
      const loggedIn = await login(email.trim(), password, 'student', remember);
      showToast(`Welcome back, ${loggedIn.name}!`);
      navigate(resolveRedirectTarget(loggedIn.role), { replace: true });
    } catch (err) {
      setServerError(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickDemoLogin = async (demoEmail, demoPass, role) => {
    try {
      setIsSubmitting(true);
      setServerError('');
      const loggedIn = await login(demoEmail, demoPass, role, true);
      showToast(`Signed in as ${loggedIn.name} (${loggedIn.role}).`);
      navigate(getDashboardPathForRole(loggedIn.role), { replace: true });
    } catch (err) {
      setServerError(err.message || 'Demo login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-shell">
      <div className="container" style={{ maxWidth: '480px' }}>
        <Card className="auth-card">
          <div className="auth-card__head">
            <img
              src={SITE.logo.medium}
              alt={SITE.logo.alt}
              width="76"
              height="76"
              className="auth-logo"
              decoding="async"
            />
            <span className="eyebrow">Campus Portal Access · {SITE.universityShort}</span>
            <h1>Sign In</h1>
            <p className="auth-card__sub">
              Access your student, faculty, or staff account to report items, view AI matches, and
              track ownership claims.
            </p>
          </div>

          {serverError && (
            <div className="alert alert--danger" role="alert" style={{ marginBottom: '1.15rem' }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Input
              id="login-email"
              label="University Email"
              type="email"
              required
              placeholder="name@university.edu"
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="login-password" className="form-label form-label--required">
                  Password
                </label>
                <Link to="/forgot-password" style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                  style={{ paddingRight: '3rem' }}
                  placeholder="Enter your password"
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
                  className="auth-pw-toggle"
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

            <label className="auth-checkbox">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember login session securely</span>
            </label>

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          {/* Seeded Evaluation Accounts */}
          <div className="auth-demo">
            <p className="auth-demo__title">One-Click Evaluation Accounts</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                style={{ flex: 1 }}
                disabled={isSubmitting}
                onClick={() => quickDemoLogin('satya@university.edu', 'student123', 'student')}
              >
                Demo Student
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                style={{ flex: 1 }}
                disabled={isSubmitting}
                onClick={() => quickDemoLogin('faculty@university.edu', 'faculty123', 'faculty')}
              >
                Demo Faculty
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                style={{ flex: 1 }}
                disabled={isSubmitting}
                onClick={() => quickDemoLogin('staff@university.edu', 'staff123', 'staff')}
              >
                Demo Staff
              </Button>
            </div>
          </div>

          <hr className="divider" />

          <div className="auth-links">
            <p>
              New to the portal? <Link to="/register"><strong>Create an account</strong></Link>
            </p>
            <p style={{ display: 'flex', justifyContent: 'center', gap: '1.15rem', flexWrap: 'wrap' }}>
              <Link to="/faculty/login" className="auth-admin-link">
                <GraduationCap size={15} aria-hidden="true" /> Faculty Portal Login
              </Link>
              <Link to="/admin/login" className="auth-admin-link">
                <ShieldCheck size={15} aria-hidden="true" /> Administrator Login
              </Link>
            </p>
          </div>
        </Card>
      </div>

      <style>{`
        .auth-shell {
          padding-top: calc(var(--navbar-height) + 2.5rem);
          padding-bottom: 4rem;
          background-color: var(--sand-200);
          min-height: calc(100vh - var(--navbar-height));
          display: flex;
          align-items: center;
        }

        .auth-card {
          padding: clamp(1.5rem, 4vw, 2.5rem);
          box-shadow: var(--shadow-lg);
        }

        .auth-card__head {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .auth-card__head h1 {
          font-size: var(--text-3xl);
          margin-bottom: 0.45rem;
        }

        .auth-card__sub {
          font-size: var(--text-sm);
          color: var(--mocha-600);
        }

        .auth-pw-toggle {
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
          border-radius: var(--radius-sm);
        }

        .auth-pw-toggle:hover {
          color: var(--mocha-900);
        }

        .auth-checkbox {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: var(--text-sm);
          color: var(--mocha-600);
          margin-bottom: 1.25rem;
          cursor: pointer;
          min-height: 44px;
        }

        .auth-checkbox input {
          width: 18px;
          height: 18px;
          accent-color: var(--mocha-900);
        }

        .auth-demo {
          margin-top: 1.25rem;
          padding: 0.9rem;
          background-color: var(--cream-100);
          border: 1px dashed var(--taupe-500);
          border-radius: var(--radius-md);
        }

        .auth-demo__title {
          font-size: var(--text-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--bronze-700);
          margin-bottom: 0.6rem;
          text-align: center;
        }

        .auth-links {
          text-align: center;
          font-size: var(--text-sm);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .auth-links p {
          margin: 0;
        }

        .auth-admin-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-weight: 600;
          color: var(--bronze-700);
        }
      `}</style>
    </section>
  );
}
