import { useState, Suspense } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Package,
  Sparkles,
  ClipboardCheck,
  FileSpreadsheet,
  SlidersHorizontal,
  Bell,
  Search,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCheck,
  GraduationCap,
  UserCheck,
  History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortalData } from '../context/PortalDataContext';
import { SITE } from '../data/siteConfig';
import Badge from './Badge';

const ADMIN_NAV_ITEMS = [
  { to: '/admin/dashboard', matchPaths: ['/admin', '/admin/dashboard'], label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/users', matchPaths: ['/admin/users'], label: 'User Management', icon: Users },
  { to: '/admin/students', matchPaths: ['/admin/students'], label: 'Student Management', icon: UserCheck },
  { to: '/admin/faculty', matchPaths: ['/admin/faculty'], label: 'Faculty Management', icon: GraduationCap },
  { to: '/admin/items', matchPaths: ['/admin/items'], label: 'Item Management', icon: Package },
  { to: '/admin/matches', matchPaths: ['/admin/matches'], label: 'AI Match Management', icon: Sparkles },
  { to: '/admin/claims', matchPaths: ['/admin/claims'], label: 'Claim Verification', icon: ClipboardCheck },
  { to: '/admin/analytics', matchPaths: ['/admin/analytics'], label: 'Analytics', icon: BarChart3 },
  { to: '/admin/reports', matchPaths: ['/admin/reports'], label: 'Reports', icon: FileSpreadsheet },
  { to: '/admin/notifications', matchPaths: ['/admin/notifications'], label: 'Notifications', icon: Bell },
  { to: '/admin/logs', matchPaths: ['/admin/logs'], label: 'Activity Logs', icon: History },
  { to: '/admin/settings', matchPaths: ['/admin/settings'], label: 'Settings', icon: SlidersHorizontal },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { notifications, claims, markNotificationRead, markAllNotificationsRead } = usePortalData();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const pendingClaimsCount = claims.filter((c) =>
    ['pending', 'under review', 'claim-pending'].includes(String(c.status).toLowerCase())
  ).length;

  const handleQuickSearchSubmit = (e) => {
    e.preventDefault();
    const q = quickSearch.trim();
    if (!q) return;
    navigate(`/admin/items?q=${encodeURIComponent(q)}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-shell">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="admin-shell__backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Dedicated Admin Sidebar Navigation */}
      <aside
        className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}
        aria-label="Administrator sidebar navigation"
      >
        <div className="admin-sidebar__brand">
          <Link to="/admin/dashboard" className="admin-sidebar__logo" onClick={() => setSidebarOpen(false)}>
            <span className="admin-sidebar__logo-badge">
              <img src={SITE.logo.small} alt="" width="36" height="36" />
            </span>
            <div>
              <strong className="admin-sidebar__title">CampusFind Admin</strong>
              <span className="admin-sidebar__subtitle">OUTR Control Center</span>
            </div>
          </Link>
          <button
            type="button"
            className="admin-sidebar__close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="admin-sidebar__role-banner">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>Authorized Administrator Session</span>
        </div>

        <nav className="admin-sidebar__nav" aria-label="Admin sections">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.matchPaths.includes(location.pathname);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{item.label}</span>
                {item.to === '/admin/claims' && pendingClaimsCount > 0 && (
                  <span className="admin-sidebar__badge">{pendingClaimsCount}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-sidebar__footer">
          <Link to="/" className="admin-sidebar__ext-link">
            <ExternalLink size={15} aria-hidden="true" /> View Public Campus Portal
          </Link>
          <button
            type="button"
            className="admin-sidebar__logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={15} aria-hidden="true" /> Sign Out of Admin
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        {/* Dedicated Admin Header */}
        <header className="admin-topbar">
          <div className="admin-topbar__left">
            <button
              type="button"
              className="admin-topbar__menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open administrator menu"
            >
              <Menu size={20} />
            </button>

            <form className="admin-topbar__search" onSubmit={handleQuickSearchSubmit}>
              <Search size={15} className="admin-topbar__search-icon" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search reports, IDs, locations, or users..."
                aria-label="Search campus reports"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
              />
            </form>
          </div>

          <div className="admin-topbar__right">
            {/* Admin Notification Center Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="admin-topbar__icon-btn"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label={`Notifications (${unreadCount} unread)`}
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="admin-topbar__notif-dot">{unreadCount}</span>}
              </button>

              {notifOpen && (
                <div className="admin-notif-popover" role="dialog" aria-label="Administrator notifications">
                  <div className="admin-notif-popover__head">
                    <strong>Admin Notifications</strong>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="admin-notif-popover__mark"
                        onClick={() => markAllNotificationsRead()}
                      >
                        <CheckCheck size={13} /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="admin-notif-popover__list">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 6).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          className={`admin-notif-popover__item ${!n.isRead ? 'admin-notif-popover__item--unread' : ''}`}
                          onClick={() => {
                            markNotificationRead(n.id);
                            setNotifOpen(false);
                            if (n.link) navigate(n.link);
                          }}
                        >
                          <strong>{n.title}</strong>
                          <span>{n.message}</span>
                        </button>
                      ))
                    ) : (
                      <p style={{ padding: '1rem', fontSize: 'var(--text-xs)', color: 'var(--mocha-600)', margin: 0 }}>
                        No new administrator notifications.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="admin-topbar__profile">
              <div className="admin-topbar__avatar" aria-hidden="true">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="admin-topbar__user-info">
                <strong>{user?.name || 'OUTR Administrator'}</strong>
                <span>
                  <Badge status="admin">Admin</Badge> · {user?.identifier || 'ADM-001'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={handleLogout}
                title="Log out of Administrator Console"
              >
                <LogOut size={14} aria-hidden="true" /> Logout
              </button>
            </div>
          </div>
        </header>

        {/* Admin Page Content */}
        <main id="main-content" className="admin-content">
          <Suspense
            fallback={
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--mocha-600)' }}>
                Loading Administrator Module...
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      <style>{`
        .admin-shell {
          display: flex;
          min-height: 100vh;
          background-color: var(--bg-main, #F5F0E8);
          color: var(--coffee-dark, #3D3228);
        }

        .admin-shell__backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(61, 50, 40, 0.45);
          z-index: 90;
        }

        .admin-sidebar {
          width: 268px;
          background-color: #3D3228;
          color: #F5F0E8;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 100;
          transform: translateX(-100%);
          transition: transform 0.25s ease;
          border-right: 1px solid rgba(227, 216, 201, 0.16);
        }

        .admin-sidebar--open {
          transform: translateX(0);
        }

        @media (min-width: 1024px) {
          .admin-sidebar {
            position: sticky;
            top: 0;
            height: 100vh;
            transform: translateX(0);
          }
          .admin-shell__backdrop {
            display: none;
          }
        }

        .admin-sidebar__brand {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.15rem 1.15rem 1rem;
          border-bottom: 1px solid rgba(227, 216, 201, 0.14);
        }

        .admin-sidebar__logo {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          text-decoration: none;
          color: #FFFDF8;
        }

        .admin-sidebar__logo-badge {
          width: 42px;
          height: 42px;
          border-radius: 11px;
          background-color: #FFFDF8;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .admin-sidebar__title {
          display: block;
          font-family: var(--font-serif);
          font-size: 1.18rem;
          line-height: 1.15;
          color: #FFFDF8;
        }

        .admin-sidebar__subtitle {
          display: block;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #C4A484;
          font-weight: 600;
        }

        .admin-sidebar__close {
          background: transparent;
          border: none;
          color: #EDE4D8;
          cursor: pointer;
          padding: 0.25rem;
        }

        @media (min-width: 1024px) {
          .admin-sidebar__close {
            display: none;
          }
        }

        .admin-sidebar__role-banner {
          margin: 0.85rem 1rem 0.4rem;
          padding: 0.45rem 0.75rem;
          border-radius: var(--radius-md);
          background-color: rgba(166, 124, 82, 0.22);
          border: 1px solid rgba(196, 164, 132, 0.3);
          color: #EDE4D8;
          font-size: 0.72rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        .admin-sidebar__nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.65rem 0.85rem;
          flex: 1;
          overflow-y: auto;
        }

        .admin-sidebar__link {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0.68rem 0.85rem;
          border-radius: var(--radius-md);
          color: #EDE4D8;
          text-decoration: none;
          font-size: 0.86rem;
          font-weight: 500;
          transition: all 0.18s ease;
        }

        .admin-sidebar__link:hover {
          background-color: rgba(255, 253, 248, 0.08);
          color: #FFFDF8;
        }

        .admin-sidebar__link--active {
          background-color: #A67C52;
          color: #FFFDF8;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
        }

        .admin-sidebar__badge {
          margin-left: auto;
          background-color: #FFFDF8;
          color: #3D3228;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.1rem 0.48rem;
          border-radius: 999px;
        }

        .admin-sidebar__footer {
          padding: 0.9rem 1rem 1.15rem;
          border-top: 1px solid rgba(227, 216, 201, 0.14);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .admin-sidebar__ext-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.78rem;
          color: #C4A484;
          text-decoration: none;
          padding: 0.4rem 0.5rem;
        }

        .admin-sidebar__ext-link:hover {
          color: #FFFDF8;
        }

        .admin-sidebar__logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.55rem 0.8rem;
          border-radius: var(--radius-md);
          border: 1px solid rgba(227, 216, 201, 0.25);
          background-color: rgba(255, 253, 248, 0.06);
          color: #FFFDF8;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        .admin-sidebar__logout-btn:hover {
          background-color: rgba(185, 107, 96, 0.28);
          border-color: #B96B60;
        }

        /* Admin Main Content & Topbar */
        .admin-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .admin-topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          background-color: rgba(255, 253, 248, 0.94);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid var(--border-warm, #E3D8C9);
          padding: 0.75rem clamp(1rem, 2.5vw, 1.75rem);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .admin-topbar__left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          max-width: 460px;
        }

        .admin-topbar__menu-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: var(--radius-md);
          border: 1px solid var(--sand-300);
          background-color: var(--cream-50);
          color: var(--mocha-900);
          cursor: pointer;
          flex-shrink: 0;
        }

        @media (min-width: 1024px) {
          .admin-topbar__menu-btn {
            display: none;
          }
        }

        .admin-topbar__search {
          position: relative;
          flex: 1;
        }

        .admin-topbar__search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--mocha-600);
          pointer-events: none;
        }

        .admin-topbar__search input {
          width: 100%;
          padding: 0.48rem 0.75rem 0.48rem 2.2rem;
          border-radius: var(--radius-pill);
          border: 1px solid var(--sand-300);
          background-color: var(--cream-100);
          font-size: var(--text-xs);
          color: var(--mocha-900);
        }

        .admin-topbar__right {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .admin-topbar__icon-btn {
          position: relative;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid var(--sand-300);
          background-color: var(--cream-50);
          color: var(--mocha-900);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .admin-topbar__notif-dot {
          position: absolute;
          top: -3px;
          right: -3px;
          background-color: var(--bronze-500);
          color: var(--cream-50);
          font-size: 0.65rem;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
        }

        .admin-notif-popover {
          position: absolute;
          right: 0;
          top: calc(100% + 0.5rem);
          width: min(340px, 88vw);
          background-color: var(--cream-50);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          z-index: 80;
          overflow: hidden;
        }

        .admin-notif-popover__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 0.95rem;
          border-bottom: 1px solid var(--sand-300);
          font-size: var(--text-xs);
        }

        .admin-notif-popover__mark {
          border: none;
          background: transparent;
          color: var(--bronze-700);
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .admin-notif-popover__list {
          max-height: 300px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .admin-notif-popover__item {
          text-align: left;
          padding: 0.7rem 0.95rem;
          border: none;
          border-bottom: 1px solid var(--sand-300);
          background: transparent;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .admin-notif-popover__item--unread {
          background-color: var(--sand-200);
        }

        .admin-notif-popover__item strong {
          font-size: var(--text-xs);
          color: var(--mocha-900);
        }

        .admin-notif-popover__item span {
          font-size: 0.72rem;
          color: var(--mocha-600);
        }

        .admin-topbar__profile {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .admin-topbar__avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: #3D3228;
          color: #FFFDF8;
          font-weight: 700;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .admin-topbar__user-info {
          display: none;
          flex-direction: column;
          line-height: 1.2;
        }

        @media (min-width: 640px) {
          .admin-topbar__user-info {
            display: flex;
          }
        }

        .admin-topbar__user-info strong {
          font-size: var(--text-xs);
          color: var(--mocha-900);
        }

        .admin-topbar__user-info span {
          font-size: 0.7rem;
          color: var(--mocha-600);
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .admin-content {
          flex: 1;
          padding-bottom: 3rem;
        }

        .admin-content .page-header {
          padding-top: 1.75rem;
          padding-bottom: 1.5rem;
        }
      `}</style>
    </div>
  );
}
