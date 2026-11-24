import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, ShieldCheck, UserCheck, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortalData } from '../context/PortalDataContext';
import { SITE } from '../data/siteConfig';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';

export default function FacultyLogin() {
  const { facultyLogin } = useAuth();
  const { showToast } = usePortalData();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from?.pathname;
  const redirectTarget =
    fromPath && fromPath.startsWith('/faculty') && fromPath !== '/faculty/login'
      ? fromPath
      : '/faculty/dashboard';

  const [email, setEmail] = useState('faculty@university.edu');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter your official university faculty email address.');
      return;
    }
    if (!password) {
      setError('Please enter your faculty password.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError('');
      const user = await facultyLogin(email.trim(), password, remember);
      showToast(`Welcome to the Faculty Portal, ${user.name}!`);
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      setError(
        err.message ||
          'Invalid faculty credentials. Only Faculty and Departmental Staff accounts can access this portal.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (demoEmail, demoPass) => {
    try {
      setIsSubmitting(true);
      setError('');
      const user = await facultyLogin(demoEmail, demoPass, true);
      showToast(`Signed in to Faculty Portal as ${user.name} (${user.department}).`);
      navigate('/faculty/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Demo faculty login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="fac-auth-shell">
      <div className="container" style={{ maxWidth: '490px' }}>
        <Card className="fac-auth-card">
          <div className="fac-auth-head">
            <img
              src={SITE.logo.medium}
              alt={SITE.logo.alt}
              width="72"
              height="72"
              className="auth-logo"
              decoding="async"
            />
            <div className="fac-auth-badge">
              <GraduationCap size={14} aria-hidden="true" />
              <span>Dedicated Faculty &amp; Staff Portal · {SITE.universityShort}</span>
            </div>
            <h1>Faculty Sign In</h1>
            <p>
              Sign in with your university faculty credentials to manage lost &amp; found reports,
              inspect multimodal AI matches, and track departmental ownership claims.
            </p>
          </div>

          {error && (
            <div className="alert alert--danger" role="alert" style={{ marginBottom: '1.15rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Input
              id="faculty-email"
              label="Official Faculty Email"
              type="email"
              required
              placeholder="faculty@university.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              autoComplete="email"
            />

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="faculty-password" className="form-label form-label--required">
                  Password
                </label>
                <Link to="/forgot-password" style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="faculty-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '3rem' }}
                  placeholder="Enter faculty password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="fac-pw-toggle"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="fac-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember faculty session on this workstation</span>
            </label>

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Verifying Faculty Credentials...' : 'Enter Faculty Dashboard'}
            </Button>
          </form>

          <div className="fac-demo-box">
            <p className="fac-demo-title">
              <Building2 size={14} /> One-Click Faculty Evaluation Accounts
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                fullWidth
                disabled={isSubmitting}
                onClick={() => handleQuickDemo('faculty@university.edu', 'faculty123')}
              >
                Dr. Priyabrata Mohanty (CSE Faculty)
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                fullWidth
                disabled={isSubmitting}
                onClick={() => handleQuickDemo('staff@university.edu', 'staff123')}
              >
                Ramesh Behera (Library Staff)
              </Button>
            </div>
          </div>

          <hr className="divider" />

          <div className="fac-auth-links">
            <Link to="/login" className="fac-switch-link">
              <UserCheck size={15} /> Student Portal Sign In
            </Link>
            <Link to="/admin/login" className="fac-switch-link">
              <ShieldCheck size={15} /> Administrator Console
            </Link>
          </div>
        </Card>
      </div>

      <style>{`
        .fac-auth-shell {
          padding-top: calc(var(--navbar-height) + 2.5rem);
          padding-bottom: 4rem;
          background: linear-gradient(180deg, #F5F0E8 0%, #EDE4D8 100%);
          min-height: calc(100vh - var(--navbar-height));
          display: flex;
          align-items: center;
        }
        .fac-auth-card {
          padding: clamp(1.5rem, 4vw, 2.5rem);
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          box-shadow: var(--shadow-lg);
        }
        .fac-auth-head {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .fac-auth-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.3rem 0.85rem;
          border-radius: 999px;
          background-color: #EDE4D8;
          border: 1px solid #E3D8C9;
          color: #896642;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.65rem;
        }
        .fac-auth-head h1 {
          font-size: var(--text-3xl);
          color: #3D3228;
          margin-bottom: 0.45rem;
        }
        .fac-auth-head p {
          font-size: var(--text-sm);
          color: #82776B;
          margin: 0;
        }
        .fac-pw-toggle {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          color: #82776B;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fac-remember {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: var(--text-sm);
          color: #82776B;
          margin-bottom: 1.25rem;
          cursor: pointer;
          min-height: 44px;
        }
        .fac-remember input {
          width: 18px;
          height: 18px;
          accent-color: #A67C52;
        }
        .fac-demo-box {
          margin-top: 1.25rem;
          padding: 0.95rem;
          background-color: #F5F0E8;
          border: 1px dashed #C4A484;
          border-radius: 12px;
        }
        .fac-demo-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #896642;
          margin-bottom: 0.65rem;
        }
        .fac-auth-links {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
          font-size: var(--text-sm);
        }
        .fac-switch-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-weight: 600;
          color: #896642;
        }
        .fac-switch-link:hover {
          color: #3D3228;
        }
      `}</style>
    </section>
  );
}
