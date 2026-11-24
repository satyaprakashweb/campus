import { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePortalData } from '../context/PortalDataContext';
import Drawer from './Drawer';
import Button from './Button';
import { SITE } from '../data/siteConfig';
import {
  Menu,
  X,
  LogIn,
  UserPlus,
  User,
  LogOut,
  LayoutDashboard,
  PlusCircle,
  ShieldCheck,
  ChevronDown,
  Bell,
  Sparkles,
  BarChart3,
  Settings,
  CheckCheck,
  GraduationCap,
} from 'lucide-react';
import { getDashboardPathForRole } from './RouteGuards';

const PUBLIC_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/browse', label: 'Browse Items' },
  { to: '/matches', label: 'AI Matches' },
  { to: '/#how-it-works', label: 'How It Works' },
  { to: '/about', label: 'About' },
];

function BrandLogo() {
  return (
    <span className="navbar__brand-inner">
      <img
        src={SITE.logo.medium}
        alt=""
        width="44"
        height="44"
        className="navbar__logo-img"
        decoding="async"
      />
      <span className="navbar__logo-text">
        <span className="navbar__logo-title">CampusFind</span>
        <span className="navbar__logo-sub">Lost &amp; Found · {SITE.universityShort}</span>
      </span>
    </span>
  );
}

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } = usePortalData();
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/' && !location.hash;
    if (to.startsWith('/#')) return location.pathname === '/' && location.hash === to.slice(1);
    return location.pathname.startsWith(to);
  };

  const dashboardPath = getDashboardPathForRole(user?.role);
  const dashboardLabel =
    user?.role === 'admin'
      ? 'Admin Control Panel'
      : user?.role === 'faculty' || user?.role === 'staff'
      ? 'Faculty Dashboard'
      : 'Student Dashboard';

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`} role="banner">
        <div className="navbar__inner container">
          <Link to="/" className="navbar__logo" aria-label="CampusFind Smart Campus Lost & Found Portal — Home">
            <BrandLogo />
          </Link>

          <nav className="navbar__nav" aria-label="Primary navigation">
            {PUBLIC_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`navbar__link ${isActive(link.to) ? 'navbar__link--active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="navbar__actions">
            {isAuthenticated ? (
              <>
                {!isAdmin && (
                  <Button to="/report" variant="secondary" size="sm">
                    <PlusCircle size={15} aria-hidden="true" /> Report Item
                  </Button>
                )}

                {/* Notification Bell */}
                <div className="navbar__notif" ref={notifMenuRef}>
                  <button
                    type="button"
                    className="navbar__notif-btn"
                    onClick={() => {
                      setNotifOpen((prev) => !prev);
                      setUserMenuOpen(false);
                    }}
                    aria-label={`Notifications (${unreadCount} unread)`}
                    aria-expanded={notifOpen}
                  >
                    <Bell size={18} aria-hidden="true" />
                    {unreadCount > 0 && (
                      <span className="navbar__notif-badge" aria-hidden="true">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="navbar__notif-panel" role="dialog" aria-label="Notifications">
                      <div className="navbar__notif-head">
                        <strong>Notifications</strong>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            className="navbar__notif-clear"
                            onClick={() => markAllNotificationsRead()}
                          >
                            <CheckCheck size={13} aria-hidden="true" /> Mark all read
                          </button>
                        )}
                      </div>
                      {notifications.length > 0 ? (
                        <ul className="navbar__notif-list">
                          {notifications.slice(0, 8).map((n) => (
                            <li
                              key={n.id}
                              className={`navbar__notif-item ${!n.isRead ? 'navbar__notif-item--unread' : ''}`}
                            >
                              <button
                                type="button"
                                className="navbar__notif-link"
                                onClick={() => {
                                  markNotificationRead(n.id);
                                  setNotifOpen(false);
                                  if (n.link) navigate(n.link);
                                }}
                              >
                                <span className="navbar__notif-title">{n.title}</span>
                                <span className="navbar__notif-msg">{n.message}</span>
                                <span className="navbar__notif-time">
                                  {new Date(n.createdAt).toLocaleString()}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="navbar__notif-empty">No notifications yet.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Account Menu */}
                <div className="navbar__user-menu" ref={userMenuRef}>
                  <button
                    type="button"
                    className="navbar__user-btn"
                    onClick={() => {
                      setUserMenuOpen((prev) => !prev);
                      setNotifOpen(false);
                    }}
                    aria-expanded={userMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Account menu"
                  >
                    <span className="navbar__avatar" aria-hidden="true">
                      {isAdmin ? <ShieldCheck size={15} /> : <User size={15} />}
                    </span>
                    <span className="navbar__user-name">{user?.name?.split(' ')[0]}</span>
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      style={{
                        transform: userMenuOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 150ms ease',
                      }}
                    />
                  </button>

                  {userMenuOpen && (
                    <div className="navbar__dropdown" role="menu">
                      <div className="navbar__dropdown-header">
                        <p className="navbar__dropdown-name">{user?.name}</p>
                        <p className="navbar__dropdown-role">
                          {user?.role} · {user?.identifier}
                        </p>
                      </div>
                      <hr className="divider" style={{ margin: '0.4rem 0' }} />
                      <Link
                        to={dashboardPath}
                        className="navbar__dropdown-item"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LayoutDashboard size={15} aria-hidden="true" />
                        {dashboardLabel}
                      </Link>
                      {!isAdmin && (
                        <Link
                          to="/report"
                          className="navbar__dropdown-item"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <PlusCircle size={15} aria-hidden="true" />
                          Report Lost / Found
                        </Link>
                      )}
                      <Link
                        to="/matches"
                        className="navbar__dropdown-item"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Sparkles size={15} aria-hidden="true" />
                        AI Match Results
                      </Link>
                      <Link
                        to="/evaluation"
                        className="navbar__dropdown-item"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <BarChart3 size={15} aria-hidden="true" />
                        AI Model Evaluation
                      </Link>
                      <Link
                        to="/profile"
                        className="navbar__dropdown-item"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings size={15} aria-hidden="true" />
                        Profile &amp; Settings
                      </Link>
                      <button
                        type="button"
                        className="navbar__dropdown-item navbar__dropdown-item--danger"
                        role="menuitem"
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                          navigate('/');
                        }}
                      >
                        <LogOut size={15} aria-hidden="true" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Button to="/report" variant="secondary" size="sm">
                  <PlusCircle size={15} aria-hidden="true" /> Report Item
                </Button>
                <Button to="/faculty/login" variant="ghost" size="sm">
                  <GraduationCap size={15} aria-hidden="true" /> Faculty
                </Button>
                <Button to="/login" variant="ghost" size="sm">
                  <LogIn size={15} aria-hidden="true" /> Login
                </Button>
                <Button to="/register" variant="primary" size="sm">
                  <UserPlus size={15} aria-hidden="true" /> Get Started
                </Button>
              </>
            )}
          </div>

          <div className="navbar__mobile-controls">
            {!isAdmin && (
              <Link to="/report" className="navbar__mobile-report">
                <PlusCircle size={15} aria-hidden="true" />
                <span>Report</span>
              </Link>
            )}
            <button
              type="button"
              className="navbar__hamburger"
              onClick={() => setDrawerOpen((prev) => !prev)}
              aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={drawerOpen}
            >
              {drawerOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <Drawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        title="Mobile navigation"
        header={
          <Link to="/" className="navbar__logo" onClick={closeDrawer}>
            <BrandLogo />
          </Link>
        }
        footer={
          isAuthenticated ? (
            <>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)', marginBottom: '0.25rem' }}>
                Signed in as <strong style={{ color: 'var(--mocha-900)' }}>{user?.name}</strong> ({user?.role})
              </p>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  logout();
                  closeDrawer();
                  navigate('/');
                }}
              >
                <LogOut size={16} aria-hidden="true" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button to="/login" variant="secondary" fullWidth onClick={closeDrawer}>
                <LogIn size={16} aria-hidden="true" /> Student Login
              </Button>
              <Button to="/faculty/login" variant="secondary" fullWidth onClick={closeDrawer}>
                <GraduationCap size={16} aria-hidden="true" /> Faculty Portal Login
              </Button>
              <Button to="/register" variant="primary" fullWidth onClick={closeDrawer}>
                <UserPlus size={16} aria-hidden="true" /> Get Started
              </Button>
              <Link
                to="/admin/login"
                onClick={closeDrawer}
                style={{
                  textAlign: 'center',
                  fontSize: 'var(--text-xs)',
                  padding: '0.5rem',
                  color: 'var(--mocha-600)',
                }}
              >
                Administrator Login
              </Link>
            </>
          )
        }
      >
        <nav className="drawer__nav" aria-label="Mobile navigation">
          {PUBLIC_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeDrawer}
              className={`drawer__link ${isActive(link.to) ? 'drawer__link--active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated && (
            <>
              <hr className="divider" style={{ margin: '0.5rem 0' }} />
              <Link
                to={dashboardPath}
                onClick={closeDrawer}
                className={`drawer__link ${location.pathname.startsWith(dashboardPath) ? 'drawer__link--active' : ''}`}
              >
                <LayoutDashboard size={17} aria-hidden="true" />
                {isAdmin ? 'Admin Control Panel' : 'My Dashboard'}
                {unreadCount > 0 && (
                  <span className="badge badge--matched" style={{ marginLeft: 'auto' }}>
                    {unreadCount} new
                  </span>
                )}
              </Link>
              {!isAdmin && (
                <Link
                  to="/report"
                  onClick={closeDrawer}
                  className={`drawer__link ${location.pathname === '/report' ? 'drawer__link--active' : ''}`}
                >
                  <PlusCircle size={17} aria-hidden="true" /> Report an Item
                </Link>
              )}
              <Link
                to="/profile"
                onClick={closeDrawer}
                className={`drawer__link ${location.pathname === '/profile' ? 'drawer__link--active' : ''}`}
              >
                <Settings size={17} aria-hidden="true" /> Profile &amp; Settings
              </Link>
            </>
          )}
        </nav>
      </Drawer>

      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: var(--navbar-height);
          background-color: rgba(255, 253, 248, 0.94);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid #E3D8C9;
          z-index: 100;
          display: flex;
          align-items: center;
          transition: box-shadow 0.22s ease, background-color 0.22s ease;
        }
        .navbar--scrolled {
          box-shadow: 0 8px 26px rgba(61, 50, 40, 0.08);
          background-color: rgba(255, 253, 248, 0.98);
        }

        .navbar__mobile-controls {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-shrink: 0;
        }
        .navbar__mobile-report {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.42rem 0.72rem;
          border-radius: 999px;
          background-color: #A67C52;
          color: #FFFDF8;
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: none;
          min-height: 38px;
          white-space: nowrap;
        }
        .navbar__mobile-report:hover {
          background-color: #896642;
          color: #FFFDF8;
        }
        @media (max-width: 359px) {
          .navbar__mobile-report span {
            display: none;
          }
          .navbar__mobile-report {
            padding: 0.45rem;
          }
          .navbar__logo-img {
            width: 36px;
            height: 36px;
          }
          .navbar__logo-title {
            font-size: 1.05rem;
          }
        }

        .navbar__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .navbar__logo {
          text-decoration: none;
          color: var(--mocha-900);
          flex-shrink: 0;
        }

        .navbar__brand-inner {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
        }

        .navbar__logo-img {
          width: 44px;
          height: 44px;
          object-fit: contain;
          flex-shrink: 0;
        }

        .navbar__logo-text {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        .navbar__logo-title {
          font-family: var(--font-serif);
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--mocha-900);
        }

        .navbar__logo-sub {
          font-family: var(--font-sans);
          font-size: 0.64rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--bronze-700);
          white-space: nowrap;
        }

        @media (max-width: 359px) {
          .navbar__logo-sub {
            display: none;
          }
        }

        .navbar__nav {
          display: none;
          align-items: center;
          gap: 0.2rem;
        }

        .navbar__actions {
          display: none;
          align-items: center;
          gap: 0.5rem;
        }

        .navbar__hamburger {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border: 1px solid var(--sand-300);
          background-color: var(--cream-50);
          cursor: pointer;
          color: var(--mocha-900);
          border-radius: var(--radius-md);
          transition: background-color var(--transition-fast);
        }

        .navbar__hamburger:hover {
          background-color: var(--sand-200);
        }

        @media (min-width: 1024px) {
          .navbar__nav,
          .navbar__actions {
            display: flex;
          }

          .navbar__mobile-controls,
          .navbar__hamburger {
            display: none;
          }
        }

        .navbar__link {
          padding: 0.5rem 0.75rem;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--mocha-600);
          border-radius: var(--radius-md);
          transition: color var(--transition-fast), background-color var(--transition-fast);
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }

        .navbar__link:hover {
          color: var(--mocha-900);
          background-color: var(--sand-200);
        }

        .navbar__link--active {
          color: var(--bronze-700);
          background-color: var(--sand-200);
          font-weight: 600;
        }

        /* Notification Bell */
        .navbar__notif {
          position: relative;
        }

        .navbar__notif-btn {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--sand-300);
          background-color: var(--cream-50);
          color: var(--mocha-900);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color var(--transition-fast), background-color var(--transition-fast);
        }

        .navbar__notif-btn:hover {
          background-color: var(--sand-200);
          border-color: var(--taupe-500);
        }

        .navbar__notif-badge {
          position: absolute;
          top: -3px;
          right: -3px;
          min-width: 19px;
          height: 19px;
          padding: 0 5px;
          border-radius: var(--radius-pill);
          background-color: var(--danger);
          color: var(--cream-50);
          font-size: 0.68rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--cream-100);
        }

        .navbar__notif-panel {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: min(360px, 90vw);
          max-height: 440px;
          overflow-y: auto;
          background-color: var(--cream-50);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          z-index: 220;
        }

        .navbar__notif-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1rem;
          border-bottom: 1px solid var(--sand-300);
          font-size: var(--text-sm);
        }

        .navbar__notif-clear {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          border: none;
          background: transparent;
          color: var(--bronze-700);
          font-size: var(--text-xs);
          font-weight: 600;
          cursor: pointer;
        }

        .navbar__notif-list {
          list-style: none;
        }

        .navbar__notif-item {
          border-bottom: 1px solid var(--sand-300);
        }

        .navbar__notif-item:last-child {
          border-bottom: none;
        }

        .navbar__notif-item--unread {
          background-color: var(--sand-200);
        }

        .navbar__notif-link {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          width: 100%;
          text-align: left;
          padding: 0.8rem 1rem;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: var(--font-sans);
        }

        .navbar__notif-link:hover {
          background-color: rgba(122, 92, 54, 0.08);
        }

        .navbar__notif-title {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--mocha-900);
        }

        .navbar__notif-msg {
          font-size: var(--text-xs);
          color: var(--mocha-600);
          line-height: 1.4;
        }

        .navbar__notif-time {
          font-size: 0.68rem;
          color: var(--bronze-700);
          margin-top: 0.15rem;
        }

        .navbar__notif-empty {
          padding: 1.5rem;
          text-align: center;
          font-size: var(--text-sm);
          color: var(--mocha-600);
        }

        /* User Menu */
        .navbar__user-menu {
          position: relative;
        }

        .navbar__user-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.8rem 0.35rem 0.45rem;
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-pill);
          background-color: var(--cream-50);
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--mocha-900);
          min-height: 44px;
        }

        .navbar__user-btn:hover {
          border-color: var(--taupe-500);
        }

        .navbar__avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: var(--sand-200);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--bronze-700);
        }

        .navbar__user-name {
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .navbar__dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 230px;
          background-color: var(--cream-50);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          padding: 0.5rem;
          z-index: 220;
        }

        .navbar__dropdown-header {
          padding: 0.65rem 0.75rem;
        }

        .navbar__dropdown-name {
          font-weight: 600;
          font-size: var(--text-sm);
          color: var(--mocha-900);
          margin: 0;
        }

        .navbar__dropdown-role {
          font-size: var(--text-xs);
          color: var(--bronze-700);
          text-transform: capitalize;
          margin: 0;
        }

        .navbar__dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          width: 100%;
          padding: 0.6rem 0.75rem;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--mocha-900);
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          text-decoration: none;
          font-family: var(--font-sans);
          min-height: 42px;
        }

        .navbar__dropdown-item:hover {
          background-color: var(--sand-200);
        }

        .navbar__dropdown-item--danger {
          color: var(--lost-text);
        }

        .navbar__dropdown-item--danger:hover {
          background-color: var(--lost-bg);
        }
      `}</style>
    </>
  );
}
