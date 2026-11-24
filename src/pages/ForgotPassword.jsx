import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { api } from '../data/api';
import { usePortalData } from '../context/PortalDataContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { showToast } = usePortalData();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter your registered university email address.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError('');
      const res = await api.forgotPassword(email.trim());
      if (res.demoResetToken) {
        setGeneratedToken(res.demoResetToken);
        setResetToken(res.demoResetToken);
      }
      setStep(2);
    } catch (err) {
      setError(err.message || 'Could not generate verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetToken.trim()) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError('');
      await api.resetPassword({
        email: email.trim(),
        resetToken: resetToken.trim(),
        newPassword,
      });
      showToast('Password reset successfully! Please sign in.');
      setStep(3);
    } catch (err) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      style={{
        paddingTop: 'calc(var(--navbar-height) + 2.5rem)',
        paddingBottom: '4rem',
        backgroundColor: 'var(--sand-200)',
        minHeight: 'calc(100vh - var(--navbar-height))',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div className="container" style={{ maxWidth: '470px' }}>
        <Card style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem)', boxShadow: 'var(--shadow-lg)' }}>
          {step === 3 ? (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: 'var(--verified-bg)',
                  color: 'var(--verified-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <span className="eyebrow">Password Updated</span>
              <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: '0.6rem' }}>
                Password Reset Complete
              </h1>
              <p style={{ fontSize: 'var(--text-sm)', marginBottom: '1.5rem' }}>
                Your account password has been hashed and updated in the database.
              </p>
              <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/login')}>
                Return to Sign In
              </Button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: 'var(--mocha-900)',
                    color: 'var(--cream-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.85rem',
                  }}
                >
                  <KeyRound size={22} />
                </div>
                <span className="eyebrow">Account Recovery</span>
                <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: '0.4rem' }}>
                  {step === 1 ? 'Forgot Password' : 'Reset Your Password'}
                </h1>
                <p style={{ fontSize: 'var(--text-sm)' }}>
                  {step === 1
                    ? 'Enter your registered university email to generate a password reset verification code.'
                    : `Verification code generated for ${email}.`}
                </p>
              </div>

              {error && (
                <div className="alert alert--danger" role="alert" style={{ marginBottom: '1rem' }}>
                  {error}
                </div>
              )}

              {step === 1 ? (
                <form onSubmit={handleRequestCode} noValidate>
                  <Input
                    id="forgot-email"
                    label="University Email"
                    type="email"
                    required
                    placeholder="satya@university.edu"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                  />
                  <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
                    {isSubmitting ? 'Generating Code...' : 'Send Verification Code'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} noValidate>
                  {generatedToken && (
                    <div className="alert alert--info" style={{ marginBottom: '1rem' }}>
                      <div>
                        <strong>Verification Code: {generatedToken}</strong>
                        <p style={{ margin: '0.2rem 0 0', fontSize: 'var(--text-xs)' }}>
                          Pre-filled below for local evaluation without external email delivery.
                        </p>
                      </div>
                    </div>
                  )}

                  <Input
                    id="reset-code"
                    label="6-Digit Verification Code"
                    required
                    value={resetToken}
                    onChange={(e) => {
                      setResetToken(e.target.value);
                      setError('');
                    }}
                  />

                  <Input
                    id="reset-new-pw"
                    label="New Password"
                    type="password"
                    required
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError('');
                    }}
                  />

                  <Input
                    id="reset-confirm-pw"
                    label="Confirm New Password"
                    type="password"
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                  />

                  <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
                    {isSubmitting ? 'Updating Password...' : 'Reset Password'}
                  </Button>
                </form>
              )}

              <hr className="divider" />
              <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', margin: 0 }}>
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                  <ArrowLeft size={15} /> Back to Sign In
                </Link>
              </p>
            </>
          )}
        </Card>
      </div>
    </section>
  );
}
