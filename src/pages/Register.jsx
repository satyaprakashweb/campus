import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortalData } from '../context/PortalDataContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { SITE } from '../data/siteConfig';

export default function Register() {
  const { register } = useAuth();
  const { showToast } = usePortalData();
  const navigate = useNavigate();

  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [department, setDepartment] = useState('');
  const [course, setCourse] = useState('');
  const [semester, setSemester] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearError = (field) => {
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};

    if (!name.trim()) nextErrors.name = 'Full name is required.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid university email address.';
    }
    if (!identifier.trim()) {
      nextErrors.identifier =
        role === 'student' ? 'Student Roll Number is required.' : 'Employee ID is required.';
    }
    if (!department.trim()) nextErrors.department = 'Department is required.';
    if (role === 'student' && !course.trim()) nextErrors.course = 'Course is required.';
    if (role === 'student' && !semester.trim()) nextErrors.semester = 'Semester is required.';
    if (!phone.trim() || phone.trim().length < 7) {
      nextErrors.phone = 'Enter a valid contact phone number.';
    }
    if (password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
    if (password !== confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    if (!accepted) nextErrors.accepted = 'Please acknowledge the campus portal guidelines.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setServerError('');
      await register({
        name: name.trim(),
        email: email.trim(),
        role,
        identifier: identifier.trim(),
        department: department.trim(),
        course: course.trim() || (role === 'faculty' ? 'Faculty' : 'Administration'),
        semester: semester.trim() || (role === 'student' ? '7th Semester' : role),
        phone: phone.trim(),
        password,
      });
      showToast('Account registered and signed in!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="reg-shell">
      <div className="container" style={{ maxWidth: '580px' }}>
        <Card className="reg-card">
          <div className="reg-card__head">
            <img
              src={SITE.logo.medium}
              alt={SITE.logo.alt}
              width="76"
              height="76"
              className="auth-logo"
              decoding="async"
            />
            <span className="eyebrow">Create CampusFind Account</span>
            <h1>Register</h1>
            <p className="reg-card__sub">
              Select your campus role (Student, Faculty, or Staff) to report items, view AI matches,
              and submit ownership claims.
            </p>
          </div>

          {serverError && (
            <div className="alert alert--danger" role="alert" style={{ marginBottom: '1.25rem' }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <span className="form-label form-label--required" id="role-selector-label">
                Campus Role
              </span>
              <div
                className="toggle-group"
                style={{ width: '100%' }}
                role="group"
                aria-labelledby="role-selector-label"
              >
                {[
                  { id: 'student', label: 'Student' },
                  { id: 'faculty', label: 'Faculty' },
                  { id: 'staff', label: 'Staff' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`toggle-group__btn ${role === r.id ? 'toggle-group__btn--active' : ''}`}
                    onClick={() => setRole(r.id)}
                    aria-pressed={role === r.id}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              id="reg-name"
              label="Full Name"
              required
              placeholder="e.g., Satyaprakash Naik"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError('name');
              }}
              error={errors.name}
              autoComplete="name"
            />

            <div className="reg-row">
              <Input
                id="reg-email"
                label="University Email"
                type="email"
                required
                placeholder="name@university.edu"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError('email');
                }}
                error={errors.email}
                autoComplete="email"
              />

              <Input
                id="reg-phone"
                label="Phone Number"
                type="tel"
                required
                placeholder="e.g., 9861002307"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearError('phone');
                }}
                error={errors.phone}
                autoComplete="tel"
              />
            </div>

            <div className="reg-row">
              <Input
                id="reg-identifier"
                label={role === 'student' ? 'Student ID / Roll No.' : 'Employee ID'}
                required
                placeholder={role === 'student' ? 'e.g., 23110307' : 'e.g., FAC-204'}
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  clearError('identifier');
                }}
                error={errors.identifier}
              />

              <Input
                id="reg-dept"
                label="Department"
                required
                placeholder="e.g., Computer Science & Engineering"
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  clearError('department');
                }}
                error={errors.department}
              />
            </div>

            <div className="reg-row">
              <Input
                id="reg-course"
                label={role === 'student' ? 'Course' : 'Designation / Division'}
                required={role === 'student'}
                placeholder={role === 'student' ? 'e.g., B.Tech' : 'e.g., Assistant Professor'}
                value={course}
                onChange={(e) => {
                  setCourse(e.target.value);
                  clearError('course');
                }}
                error={errors.course}
              />

              <Input
                id="reg-semester"
                label={role === 'student' ? 'Semester' : 'Office / Unit'}
                required={role === 'student'}
                placeholder={role === 'student' ? 'e.g., 7th Semester' : 'e.g., Academic Block'}
                value={semester}
                onChange={(e) => {
                  setSemester(e.target.value);
                  clearError('semester');
                }}
                error={errors.semester}
              />
            </div>

            <div className="reg-row">
              <div className="form-group">
                <label htmlFor="reg-password" className="form-label form-label--required">
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                    style={{ paddingRight: '3rem' }}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError('password');
                    }}
                    aria-invalid={Boolean(errors.password)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="reg-pw-toggle"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="form-error" role="alert">
                    {errors.password}
                  </p>
                ) : (
                  <p className="form-hint">Hashed with scrypt before database storage.</p>
                )}
              </div>

              <Input
                id="reg-confirm"
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearError('confirmPassword');
                }}
                error={errors.confirmPassword}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label className="reg-checkbox">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => {
                    setAccepted(e.target.checked);
                    clearError('accepted');
                  }}
                />
                <span>
                  I confirm I am a student, faculty, or staff member of {SITE.university} (
                  {SITE.universityShort}), {SITE.city}, and agree to provide accurate item reports
                  and ownership details.
                </span>
              </label>
              {errors.accepted && (
                <p className="form-error" role="alert">
                  {errors.accepted}
                </p>
              )}
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <hr className="divider" />

          <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', margin: 0 }}>
            Already registered? <Link to="/login"><strong>Sign in here</strong></Link>
          </p>
        </Card>
      </div>

      <style>{`
        .reg-shell {
          padding-top: calc(var(--navbar-height) + 2.5rem);
          padding-bottom: 4rem;
          background-color: var(--sand-200);
          min-height: calc(100vh - var(--navbar-height));
          display: flex;
          align-items: center;
        }

        .reg-card {
          padding: clamp(1.5rem, 4vw, 2.5rem);
          box-shadow: var(--shadow-lg);
        }

        .reg-card__head {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .reg-card__head h1 {
          font-size: var(--text-3xl);
          margin-bottom: 0.45rem;
        }

        .reg-card__sub {
          font-size: var(--text-sm);
          color: var(--mocha-600);
        }

        .reg-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0 1rem;
        }

        @media (min-width: 540px) {
          .reg-row {
            grid-template-columns: 1fr 1fr;
          }
        }

        .reg-pw-toggle {
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

        .reg-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          font-size: var(--text-xs);
          color: var(--mocha-600);
          cursor: pointer;
        }

        .reg-checkbox input {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          flex-shrink: 0;
          accent-color: var(--mocha-900);
        }
      `}</style>
    </section>
  );
}
