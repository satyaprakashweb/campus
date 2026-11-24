import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Lock, Bell, FileText, ClipboardCheck, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortalData } from '../context/PortalDataContext';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Input from '../components/Input';

export default function Profile() {
  const { user, updateProfile, changePassword } = useAuth();
  const { items, claims, showToast } = usePortalData();

  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [course, setCourse] = useState(user?.course || '');
  const [semester, setSemester] = useState(user?.semester || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [inAppAlerts, setInAppAlerts] = useState(user?.notificationPrefs?.inApp ?? true);
  const [emailAlerts, setEmailAlerts] = useState(user?.notificationPrefs?.emailAlerts ?? false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [isSavingPw, setIsSavingPw] = useState(false);

  const myReports = items.filter((i) => i.userId === user?.id);
  const myClaims = claims.filter((c) => c.claimantId === user?.id);

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) {
      showToast('Please select an image file under 3 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Full name is required.', 'error');
      return;
    }
    try {
      setIsSavingProfile(true);
      await updateProfile({
        name: name.trim(),
        department: department.trim(),
        course: course.trim(),
        semester: semester.trim(),
        phone: phone.trim(),
        avatar,
        notificationPrefs: {
          inApp: inAppAlerts,
          emailAlerts,
        },
      });
      showToast('Profile settings saved to database.');
    } catch (err) {
      showToast(err.message || 'Failed to save profile.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (!currentPassword || !newPassword) {
      setPwError('Enter both current and new password.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    try {
      setIsSavingPw(true);
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed successfully.');
    } catch (err) {
      setPwError(err.message || 'Could not change password.');
    } finally {
      setIsSavingPw(false);
    }
  };

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <span className="eyebrow">Account Management</span>
          <h1>Profile &amp; Account Settings</h1>
          <p className="page-header__lead">
            Manage your campus identity details, security credentials, notification preferences, and
            report history.
          </p>
        </div>
      </section>

      <section className="section section--compact">
        <div className="container">
          <div className="profile-grid">
            {/* Left Column: Edit Profile & Preferences */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div className="profile-avatar">
                    {avatar ? (
                      <img src={avatar} alt={user?.name} />
                    ) : (
                      <User size={30} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: 'var(--text-2xl)' }}>{user?.name}</h2>
                      <Badge status={user?.role} />
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', margin: '0.2rem 0 0.6rem' }}>
                      {user?.email} · ID: <strong>{user?.identifier}</strong>
                    </p>
                    <label className="btn btn--secondary btn--sm" style={{ cursor: 'pointer' }}>
                      <Upload size={14} aria-hidden="true" /> Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleAvatarUpload}
                      />
                    </label>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} noValidate>
                  <Input
                    id="prof-name"
                    label="Full Name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <div className="profile-row">
                    <Input
                      id="prof-dept"
                      label="Department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                    <Input
                      id="prof-phone"
                      label="Phone Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="profile-row">
                    <Input
                      id="prof-course"
                      label="Course / Division"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                    />
                    <Input
                      id="prof-semester"
                      label="Semester / Role Level"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                    />
                  </div>

                  <hr className="divider" />

                  <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Bell size={18} style={{ color: 'var(--bronze-700)' }} /> Notification Preferences
                  </h3>

                  <label className="profile-check">
                    <input
                      type="checkbox"
                      checked={inAppAlerts}
                      onChange={(e) => setInAppAlerts(e.target.checked)}
                    />
                    <span>Receive in-app notifications for AI matches, claim reviews, and handovers</span>
                  </label>

                  <label className="profile-check" style={{ marginBottom: '1.25rem' }}>
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                    />
                    <span>Enable campus email digest alerts when high-confidence matches occur</span>
                  </label>

                  <Button type="submit" variant="primary" disabled={isSavingProfile}>
                    {isSavingProfile ? 'Saving Changes...' : 'Save Profile Settings'}
                  </Button>
                </form>
              </Card>

              {/* Change Password */}
              <Card>
                <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={19} style={{ color: 'var(--bronze-700)' }} /> Change Password
                </h2>

                {pwError && (
                  <div className="alert alert--danger" role="alert" style={{ marginBottom: '1rem' }}>
                    {pwError}
                  </div>
                )}

                <form onSubmit={handleChangePassword} noValidate>
                  <Input
                    id="pw-current"
                    label="Current Password"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <div className="profile-row">
                    <Input
                      id="pw-new"
                      label="New Password"
                      type="password"
                      required
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Input
                      id="pw-confirm"
                      label="Confirm New Password"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" variant="secondary" disabled={isSavingPw}>
                    {isSavingPw ? 'Updating Password...' : 'Update Password'}
                  </Button>
                </form>
              </Card>
            </div>

            {/* Right Column: Report & Claim History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <Card compact>
                <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={18} style={{ color: 'var(--bronze-700)' }} /> My Report History ({myReports.length})
                </h2>
                {myReports.length > 0 ? (
                  <ul className="profile-history-list">
                    {myReports.map((r) => (
                      <li key={r.id} className="profile-history-item">
                        <div>
                          <Link to={`/items/${r.id}`} style={{ fontWeight: 600, color: 'var(--mocha-900)' }}>
                            {r.title}
                          </Link>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                            {r.reportCode || r.id} · {r.location} · {r.date}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <Badge status={r.type} />
                          <Badge status={r.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 'var(--text-sm)' }}>No reports submitted yet.</p>
                )}
              </Card>

              <Card compact>
                <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ClipboardCheck size={18} style={{ color: 'var(--bronze-700)' }} /> My Claim History ({myClaims.length})
                </h2>
                {myClaims.length > 0 ? (
                  <ul className="profile-history-list">
                    {myClaims.map((c) => (
                      <li key={c.id} className="profile-history-item">
                        <div>
                          <Link to={`/claims/${c.id}`} style={{ fontWeight: 600, color: 'var(--mocha-900)' }}>
                            {c.claimCode || c.id}
                          </Link>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                            Submitted {new Date(c.submittedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge status={c.status} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 'var(--text-sm)' }}>No ownership claims submitted yet.</p>
                )}
              </Card>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .profile-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        @media (min-width: 1024px) {
          .profile-grid {
            grid-template-columns: 1.25fr 0.85fr;
          }
        }

        .profile-avatar {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background-color: var(--sand-200);
          border: 2px solid var(--sand-300);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--bronze-700);
          overflow: hidden;
          flex-shrink: 0;
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0 1rem;
        }

        @media (min-width: 560px) {
          .profile-row {
            grid-template-columns: 1fr 1fr;
          }
        }

        .profile-check {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          font-size: var(--text-sm);
          color: var(--mocha-900);
          margin-bottom: 0.65rem;
          cursor: pointer;
        }

        .profile-check input {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          accent-color: var(--mocha-900);
        }

        .profile-history-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .profile-history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--sand-300);
          flex-wrap: wrap;
        }

        .profile-history-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
      `}</style>
    </div>
  );
}
