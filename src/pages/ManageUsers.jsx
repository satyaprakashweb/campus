import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, UserCheck, UserX, Search, Eye, FileText, PackageCheck } from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';
import { AdminSubnav } from './AdminDashboard';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function ManageUsers() {
  const { users, items, claims, updateUserRole } = usePortalData();
  const location = useLocation();
  const [draftRoles, setDraftRoles] = useState({});
  const [savedId, setSavedId] = useState(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState(() => {
    if (location.pathname === '/admin/students') return 'student';
    if (location.pathname === '/admin/faculty') return 'staff';
    return 'all';
  });
  const [inspectingUser, setInspectingUser] = useState(null);

  useEffect(() => {
    if (location.pathname === '/admin/students') setRoleFilter('student');
    else if (location.pathname === '/admin/faculty') setRoleFilter('staff');
    else if (location.pathname === '/admin/users') setRoleFilter('all');
  }, [location.pathname]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter === 'student' && u.role !== 'student') return false;
      if (roleFilter === 'staff' && u.role !== 'staff' && u.role !== 'faculty') return false;
      if (roleFilter === 'admin' && u.role !== 'admin') return false;
      if (q) {
        const hay = `${u.name || ''} ${u.email || ''} ${u.identifier || ''} ${u.department || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, query, roleFilter]);

  const handleRoleChange = (userId, nextRole) => {
    setDraftRoles((prev) => ({ ...prev, [userId]: nextRole }));
    setSavedId(null);
  };

  const handleSave = async (userId) => {
    const nextRole = draftRoles[userId];
    if (!nextRole) return;
    await updateUserRole(userId, nextRole);
    setDraftRoles((prev) => {
      const copy = { ...prev };
      delete copy[userId];
      return copy;
    });
    setSavedId(userId);
  };

  const handleToggleActive = async (u) => {
    const nextActive = !(u.isActive !== false);
    await updateUserRole(u.id, u.role, nextActive);
  };

  const userReports = useMemo(() => {
    if (!inspectingUser) return [];
    return items.filter((i) => i.userId === inspectingUser.id);
  }, [inspectingUser, items]);

  const userClaims = useMemo(() => {
    if (!inspectingUser) return [];
    return claims.filter((c) => c.claimantId === inspectingUser.id);
  }, [inspectingUser, claims]);

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <span className="eyebrow">Role-Based Access Control</span>
          <h1>User Management &amp; Permissions</h1>
          <p className="page-header__lead">
            Search campus accounts by name, email, or student/employee ID, filter by role, inspect
            reporting and recovery history, and manage account status.
          </p>
          <AdminSubnav />
        </div>
      </section>

      <section className="section section--compact">
        <div className="container">
          {/* Search & Role Filters */}
          <Card compact style={{ marginBottom: '1.5rem' }}>
            <div className="user-filters-grid">
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--mocha-600)',
                  }}
                  aria-hidden="true"
                />
                <input
                  type="search"
                  className="form-input"
                  style={{ paddingLeft: '2.45rem' }}
                  placeholder="Search name, university email, or student/employee ID..."
                  aria-label="Search registered users"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <select
                className="form-select"
                aria-label="Filter users by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles ({users.length})</option>
                <option value="student">Students</option>
                <option value="staff">Faculty &amp; Staff</option>
                <option value="admin">Administrators</option>
              </select>
            </div>
          </Card>

          {filteredUsers.length > 0 ? (
            <div className="table-wrapper">
              <div className="table-scroll">
                <table className="table table--responsive">
                  <thead>
                    <tr>
                      <th>Name &amp; Department</th>
                      <th>Email</th>
                      <th>ID / Roll No</th>
                      <th>Activity</th>
                      <th>Role &amp; Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const selectedRole = draftRoles[u.id] ?? u.role;
                      const hasChanges = draftRoles[u.id] && draftRoles[u.id] !== u.role;
                      const isActive = u.isActive !== false;
                      const reportedCount = items.filter((i) => i.userId === u.id).length;
                      const recoveredCount = items.filter(
                        (i) =>
                          i.userId === u.id &&
                          ['returned', 'resolved'].includes(String(i.status).toLowerCase())
                      ).length;

                      return (
                        <tr key={u.id}>
                          <td data-label="Name" className="td--title">
                            <strong>{u.name}</strong>
                            {(u.department || u.semester) && (
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                                {[u.department, u.semester].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </td>
                          <td data-label="Email" style={{ wordBreak: 'break-word' }}>{u.email}</td>
                          <td data-label="ID / Roll No" style={{ whiteSpace: 'nowrap' }}>{u.identifier || '—'}</td>
                          <td data-label="Activity">
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-900)', fontWeight: 600 }}>
                              {reportedCount} reported · {recoveredCount} recovered
                            </span>
                          </td>
                          <td data-label="Role & Status">
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <Badge status={u.role} />
                              <Badge variant={isActive ? 'verified' : 'rejected'}>
                                {isActive ? 'Active' : 'Deactivated'}
                              </Badge>
                            </div>
                          </td>
                          <td data-label="Actions" className="td--actions">
                            <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setInspectingUser(u)}
                              >
                                <Eye size={13} aria-hidden="true" /> Profile &amp; History
                              </Button>

                              <select
                                aria-label={`Select role for ${u.name}`}
                                className="form-select"
                                style={{ minWidth: '130px', width: 'auto', padding: '0.4rem 0.6rem', fontSize: 'var(--text-xs)' }}
                                value={selectedRole}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              >
                                <option value="student">Student</option>
                                <option value="faculty">Faculty</option>
                                <option value="staff">Staff</option>
                                <option value="admin">Administrator</option>
                              </select>

                              {hasChanges && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleSave(u.id)}
                                >
                                  Save
                                </Button>
                              )}

                              {u.role !== 'admin' && (
                                <Button
                                  variant={isActive ? 'danger-outline' : 'secondary'}
                                  size="sm"
                                  onClick={() => handleToggleActive(u)}
                                >
                                  {isActive ? (
                                    <>
                                      <UserX size={13} /> Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck size={13} /> Activate
                                    </>
                                  )}
                                </Button>
                              )}

                              {savedId === u.id && !hasChanges && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--verified-text)',
                                    fontWeight: 600,
                                  }}
                                  role="status"
                                >
                                  <Check size={14} aria-hidden="true" /> Updated
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No users match your search"
              description="Try clearing the search query or selecting a broader role filter."
            />
          )}
        </div>
      </section>

      {/* User Profile & Reporting History Modal */}
      <Modal
        isOpen={Boolean(inspectingUser)}
        onClose={() => setInspectingUser(null)}
        title={`User Profile & Reporting History · ${inspectingUser?.name || ''}`}
      >
        {inspectingUser && (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <Badge status={inspectingUser.role} />
              <Badge variant="neutral">ID: {inspectingUser.identifier || '—'}</Badge>
              <Badge variant={inspectingUser.isActive !== false ? 'verified' : 'rejected'}>
                {inspectingUser.isActive !== false ? 'Active Account' : 'Deactivated'}
              </Badge>
            </div>

            <div className="alert alert--info" style={{ flexDirection: 'column', gap: '0.35rem', marginBottom: '1.15rem' }}>
              <div><strong>Email:</strong> {inspectingUser.email}</div>
              {inspectingUser.department && <div><strong>Department:</strong> {inspectingUser.department}</div>}
              {inspectingUser.course && <div><strong>Course / Semester:</strong> {inspectingUser.course} · {inspectingUser.semester}</div>}
              {inspectingUser.phone && <div><strong>Phone:</strong> {inspectingUser.phone}</div>}
            </div>

            <h3 style={{ fontSize: 'var(--text-base)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={15} /> Reported Lost &amp; Found Items ({userReports.length})
            </h3>
            {userReports.length > 0 ? (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.15rem' }}>
                {userReports.map((rep) => (
                  <li
                    key={rep.id}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--cream-100)',
                      border: '1px solid var(--sand-300)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 'var(--text-xs)', display: 'block' }}>
                        {rep.title} ({rep.reportCode || rep.id})
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--mocha-600)' }}>
                        {rep.location} · {rep.date}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <Badge status={rep.type} />
                      <Badge status={rep.status} />
                      <Link to={`/items/${rep.id}`} style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                        View →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)', marginBottom: '1.15rem' }}>
                No reports submitted by this user.
              </p>
            )}

            <h3 style={{ fontSize: 'var(--text-base)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <PackageCheck size={15} /> Ownership Claims &amp; Recoveries ({userClaims.length})
            </h3>
            {userClaims.length > 0 ? (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {userClaims.map((cl) => (
                  <li
                    key={cl.id}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--cream-100)',
                      border: '1px solid var(--sand-300)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 'var(--text-xs)', display: 'block' }}>
                        {cl.claimCode || cl.id}
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--mocha-600)' }}>
                        {cl.identifyingDetails}
                      </span>
                    </div>
                    <Badge status={cl.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)', marginBottom: '1rem' }}>
                No ownership claims submitted by this user.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setInspectingUser(null)}>
                Close Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .user-filters-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }

        @media (min-width: 640px) {
          .user-filters-grid {
            grid-template-columns: 1fr 240px;
          }
        }
      `}</style>
    </div>
  );
}
