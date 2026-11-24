import { useState, useMemo } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Package,
  Sparkles,
  FileCheck2,
  Bell,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortalData } from '../context/PortalDataContext';
import { SITE } from '../data/siteConfig';

const FACULTY_NAV_ITEMS = [
  { to: '/faculty/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/faculty/report', label: 'Report Item', icon: PlusCircle },
  { to: '/faculty/items', label: 'My Reports', icon: Package },
  { to: '/faculty/lost-reports', label: 'Lost Reports', icon: AlertCircle, subItem: true },
  { to: '/faculty/found-reports', label: 'Found Reports', icon: CheckCircle2, subItem: true },
  { to: '/faculty/ai-matches', label: 'AI Matches', icon: Sparkles },
  { to: '/faculty/claims', label: 'Ownership Claims', icon: FileCheck2 },
  { to: '/faculty/notifications', label: 'Notifications', icon: Bell },
  { to: '/faculty/profile', label: 'My Profile', icon: User },
  { to: '/faculty/settings', label: 'Settings', icon: Settings },
];

export default function FacultyLayout() {
  const { user, logout } = useAuth();
  const { items = [], claims = [], notifications = [], aiMatches = [] } = usePortalData();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');

  const myItems = useMemo(
    () => items.filter((item) => item.userId === user?.id),
    [items, user?.id]
  );

  const myItemIds = useMemo(() => new Set(myItems.map((i) => i.id)), [myItems]);

  const myActiveMatchesCount = useMemo(
    () =>
      aiMatches.filter(
        (m) =>
          m.status !== 'invalidated' &&
          m.status !== 'dismissed' &&
          (myItemIds.has(m.lostItemId) || myItemIds.has(m.foundItemId))
      ).length,
    [aiMatches, myItemIds]
  );

  const myPendingClaimsCount = useMemo(
    () =>
      claims.filter(
        (c) =>
          c.status === 'Pending' &&
          (c.claimantId === user?.id || myItemIds.has(c.foundItemId) || myItemIds.has(c.lostItemId))
      ).length,
    [claims, user?.id, myItemIds]
  );

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => n.userId === user?.id && !n.isRead).length,
    [notifications, user?.id]
  );

  const handleLogout = () => {
    logout();
    navigate('/faculty/login');
  };

  const handleQuickSearch = (e) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    navigate(`/faculty/items?q=${encodeURIComponent(quickQuery.trim())}`);
  };

  const currentSectionTitle = useMemo(() => {
    const p = location.pathname;
    if (p.includes('/report')) return 'Report Lost or Found Item';
    if (p.includes('/lost-reports')) return 'Faculty Lost Reports';
    if (p.includes('/found-reports')) return 'Faculty Found Reports';
    if (p.includes('/items')) return 'My Lost & Found Reports';
    if (p.includes('/ai-matches')) return 'Multimodal AI Match Discovery';
    if (p.includes('/claims')) return 'Ownership Claims & Handover';
    if (p.includes('/notifications')) return 'Faculty Alerts & Announcements';
    if (p.includes('/profile')) return 'Faculty Profile & Credentials';
    if (p.includes('/settings')) return 'Portal Preferences & Security';
    return 'Faculty Dashboard Overview';
  }, [location.pathname]);

  const badgeForPath = (path) => {
    if (path === '/faculty/items') return myItems.length || null;
    if (path === '/faculty/ai-matches') return myActiveMatchesCount || null;
    if (path === '/faculty/claims') return myPendingClaimsCount || null;
    if (path === '/faculty/notifications') return unreadNotificationsCount || null;
    return null;
  };

  return (
    <div className={`fac-shell ${desktopCollapsed ? 'fac-shell--collapsed' : ''}`}>
      {mobileSidebarOpen && (
        <div
          className="fac-shell__backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Collapsible Desktop & Slide-Out Mobile Faculty Sidebar */}
      <aside
        className={`fac-sidebar ${mobileSidebarOpen ? 'fac-sidebar--open' : ''} ${
          desktopCollapsed ? 'fac-sidebar--collapsed' : ''
        }`}
        aria-label="Faculty Portal Navigation"
      >
        <div className="fac-sidebar__brand">
          <Link to="/faculty/dashboard" className="fac-sidebar__logo-link">
            <img
              src={SITE.logo.small}
              alt={SITE.name}
              width="38"
              height="38"
              className="fac-sidebar__logo"
            />
            {!desktopCollapsed && (
              <div>
                <span className="fac-sidebar__title">CampusFind</span>
                <span className="fac-sidebar__sub">Faculty Portal · {SITE.universityShort}</span>
              </div>
            )}
          </Link>

          <button
            type="button"
            className="fac-sidebar__collapse-btn"
            onClick={() => setDesktopCollapsed((prev) => !prev)}
            aria-label={desktopCollapsed ? 'Expand faculty sidebar' : 'Collapse faculty sidebar'}
            title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {desktopCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>

          <button
            type="button"
            className="fac-sidebar__close-mobile"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close faculty menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Faculty Profile Pill inside Sidebar */}
        {!desktopCollapsed && (
          <div className="fac-sidebar__faculty-card">
            <div className="fac-sidebar__avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span>{(user?.name || 'F').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="fac-sidebar__faculty-meta">
              <strong>{user?.name || 'Faculty Member'}</strong>
              <span>
                {user?.identifier || 'FAC-204'} · {user?.department || 'Academic Dept.'}
              </span>
            </div>
          </div>
        )}

        <nav className="fac-sidebar__nav">
          {!desktopCollapsed && <span className="fac-sidebar__section-label">Faculty Workspace</span>}
          {FACULTY_NAV_ITEMS.filter((item) => !desktopCollapsed || !item.subItem).map((item) => {
            const Icon = item.icon;
            const badge = badgeForPath(item.to);
            const isOverviewActive =
              item.to === '/faculty/dashboard' &&
              (location.pathname === '/faculty' || location.pathname === '/faculty/dashboard');

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileSidebarOpen(false)}
                title={desktopCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `fac-sidebar__link ${item.subItem ? 'fac-sidebar__link--sub' : ''} ${
                    isActive || isOverviewActive ? 'fac-sidebar__link--active' : ''
                  }`
                }
              >
                <span className="fac-sidebar__link-left">
                  <Icon size={item.subItem ? 15 : 18} />
                  {!desktopCollapsed && <span>{item.label}</span>}
                </span>
                {!desktopCollapsed && badge !== null && (
                  <span className="fac-sidebar__badge">{badge}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="fac-sidebar__footer">
          <Link to="/" className="fac-sidebar__public-link" title="View Public Campus Portal">
            <ExternalLink size={16} />
            {!desktopCollapsed && <span>Public Campus Portal</span>}
          </Link>

          <button
            type="button"
            className="fac-sidebar__logout-btn"
            onClick={handleLogout}
            title="Sign Out of Faculty Portal"
          >
            <LogOut size={16} />
            {!desktopCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="fac-main">
        <header className="fac-topbar">
          <div className="fac-topbar__left">
            <button
              type="button"
              className="fac-topbar__menu-btn"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open faculty sidebar"
            >
              <Menu size={22} />
            </button>
            <div>
              <div className="fac-topbar__eyebrow">
                <GraduationCap size={13} />
                <span>
                  Faculty Dashboard · {user?.department || 'Computer Science & Engineering'}
                </span>
              </div>
              <h1 className="fac-topbar__heading">{currentSectionTitle}</h1>
            </div>
          </div>

          <div className="fac-topbar__right">
            <form onSubmit={handleQuickSearch} className="fac-topbar__search">
              <Search size={15} className="fac-topbar__search-icon" />
              <input
                type="search"
                placeholder="Search faculty reports, codes, locations..."
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                aria-label="Search faculty reports"
              />
            </form>

            <Link
              to="/faculty/report"
              className="fac-topbar__report-btn"
              title="Report a Lost or Found Item"
            >
              <PlusCircle size={16} />
              <span>Report Item</span>
            </Link>

            <Link
              to="/faculty/notifications"
              className="fac-topbar__notif-btn"
              aria-label="Faculty Notifications"
            >
              <Bell size={18} />
              {unreadNotificationsCount > 0 && (
                <span className="fac-topbar__notif-dot">{unreadNotificationsCount}</span>
              )}
            </Link>

            <Link to="/faculty/profile" className="fac-topbar__profile-chip">
              <div className="fac-topbar__avatar">
                {(user?.name || 'F').charAt(0).toUpperCase()}
              </div>
              <div className="fac-topbar__profile-text">
                <strong>{user?.name || 'Dr. Priyabrata Mohanty'}</strong>
                <span>{user?.identifier || 'FAC-204'}</span>
              </div>
            </Link>
          </div>
        </header>

        <div className="fac-content">
          <Outlet />
        </div>
      </div>

      <style>{`
        .fac-shell {
          display: grid;
          grid-template-columns: 268px minmax(0, 1fr);
          min-height: 100vh;
          background-color: #F5F0E8;
          color: #3D3228;
          transition: grid-template-columns 0.22s ease;
        }
        .fac-shell--collapsed {
          grid-template-columns: 80px minmax(0, 1fr);
        }

        .fac-sidebar {
          background: linear-gradient(180deg, #3D3228 0%, #2E251D 100%);
          color: #F5F0E8;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          border-right: 1px solid rgba(227, 216, 201, 0.16);
          z-index: 90;
          overflow-x: hidden;
        }

        .fac-sidebar__brand {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.1rem 1rem;
          border-bottom: 1px solid rgba(245, 240, 232, 0.1);
          gap: 0.45rem;
        }

        .fac-sidebar__logo-link {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          text-decoration: none;
          color: #FFFDF8;
          min-width: 0;
        }

        .fac-sidebar__logo {
          border-radius: 10px;
          border: 1px solid rgba(196, 164, 132, 0.45);
          background-color: #FFFDF8;
          padding: 2px;
          flex-shrink: 0;
        }

        .fac-sidebar__title {
          display: block;
          font-family: var(--font-serif);
          font-weight: 700;
          font-size: 1.05rem;
          color: #FFFDF8;
          line-height: 1.15;
        }

        .fac-sidebar__sub {
          display: block;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #C4A484;
          font-weight: 600;
          margin-top: 0.12rem;
        }

        .fac-sidebar__collapse-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid rgba(245, 240, 232, 0.16);
          background: rgba(245, 240, 232, 0.07);
          color: #EDE4D8;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s ease;
        }
        .fac-sidebar__collapse-btn:hover {
          background: rgba(166, 124, 82, 0.35);
        }

        .fac-sidebar__close-mobile {
          display: none;
          background: transparent;
          border: none;
          color: #EDE4D8;
          cursor: pointer;
          padding: 0.3rem;
        }

        .fac-sidebar__faculty-card {
          margin: 0.85rem 0.9rem 0.35rem;
          padding: 0.75rem 0.85rem;
          border-radius: 12px;
          background: rgba(245, 240, 232, 0.07);
          border: 1px solid rgba(196, 164, 132, 0.22);
          display: flex;
          align-items: center;
          gap: 0.7rem;
        }

        .fac-sidebar__avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #A67C52, #896642);
          color: #FFFDF8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.95rem;
          flex-shrink: 0;
          overflow: hidden;
        }
        .fac-sidebar__avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .fac-sidebar__faculty-meta {
          min-width: 0;
        }
        .fac-sidebar__faculty-meta strong {
          display: block;
          font-size: 0.82rem;
          color: #FFFDF8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fac-sidebar__faculty-meta span {
          display: block;
          font-size: 0.7rem;
          color: #C4A484;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .fac-sidebar__nav {
          flex: 1;
          padding: 0.75rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.22rem;
          overflow-y: auto;
        }

        .fac-sidebar__section-label {
          font-size: 0.66rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(245, 240, 232, 0.48);
          font-weight: 700;
          padding: 0.35rem 0.65rem 0.4rem;
        }

        .fac-sidebar__link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 0.8rem;
          border-radius: 10px;
          color: rgba(245, 240, 232, 0.8);
          font-size: 0.86rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.16s ease;
        }
        .fac-sidebar--collapsed .fac-sidebar__link {
          justify-content: center;
          padding: 0.75rem;
        }
        .fac-sidebar__link--sub {
          padding-left: 1.85rem;
          font-size: 0.8rem;
          color: rgba(245, 240, 232, 0.68);
        }

        .fac-sidebar__link:hover {
          background-color: rgba(245, 240, 232, 0.09);
          color: #FFFDF8;
        }

        .fac-sidebar__link--active {
          background: linear-gradient(135deg, #A67C52 0%, #896642 100%);
          color: #FFFDF8;
          font-weight: 600;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
        }

        .fac-sidebar__link-left {
          display: flex;
          align-items: center;
          gap: 0.68rem;
        }

        .fac-sidebar__badge {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.12rem 0.46rem;
          border-radius: 999px;
          background-color: rgba(255, 253, 248, 0.18);
          color: #FFFDF8;
        }

        .fac-sidebar__footer {
          padding: 0.85rem;
          border-top: 1px solid rgba(245, 240, 232, 0.1);
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .fac-sidebar__public-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.55rem 0.75rem;
          border-radius: 8px;
          background-color: rgba(245, 240, 232, 0.07);
          color: #EDE4D8;
          font-size: 0.78rem;
          font-weight: 600;
          text-decoration: none;
        }
        .fac-sidebar__public-link:hover {
          background-color: rgba(245, 240, 232, 0.14);
          color: #FFFDF8;
        }

        .fac-sidebar__logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.6rem;
          border-radius: 8px;
          border: 1px solid rgba(185, 107, 96, 0.42);
          background-color: rgba(185, 107, 96, 0.15);
          color: #F4D3CE;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .fac-sidebar__logout-btn:hover {
          background-color: rgba(185, 107, 96, 0.28);
          color: #FFFDF8;
        }

        .fac-main {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .fac-topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background-color: rgba(255, 253, 248, 0.94);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #E3D8C9;
          padding: 0.85rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .fac-topbar__left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .fac-topbar__menu-btn {
          display: none;
          background: #FFFDF8;
          border: 1px solid #E3D8C9;
          border-radius: 8px;
          padding: 0.45rem;
          color: #3D3228;
          cursor: pointer;
        }

        .fac-topbar__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #A67C52;
          font-weight: 700;
        }

        .fac-topbar__heading {
          font-size: 1.2rem;
          margin: 0;
          color: #3D3228;
        }

        .fac-topbar__right {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          flex-wrap: wrap;
        }

        .fac-topbar__search {
          position: relative;
          display: flex;
          align-items: center;
        }
        .fac-topbar__search-icon {
          position: absolute;
          left: 0.75rem;
          color: #82776B;
          pointer-events: none;
        }
        .fac-topbar__search input {
          padding: 0.48rem 0.85rem 0.48rem 2.15rem;
          border-radius: 999px;
          border: 1px solid #E3D8C9;
          background-color: #F5F0E8;
          font-size: 0.8rem;
          color: #3D3228;
          width: 240px;
        }
        .fac-topbar__search input:focus {
          outline: none;
          border-color: #A67C52;
          background-color: #FFFDF8;
        }

        .fac-topbar__report-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.48rem 0.9rem;
          border-radius: 999px;
          background-color: #A67C52;
          color: #FFFDF8;
          font-size: 0.8rem;
          font-weight: 600;
          text-decoration: none;
          transition: background-color 0.16s ease;
        }
        .fac-topbar__report-btn:hover {
          background-color: #896642;
          color: #FFFDF8;
        }

        .fac-topbar__notif-btn {
          position: relative;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid #E3D8C9;
          background-color: #FFFDF8;
          color: #3D3228;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }
        .fac-topbar__notif-dot {
          position: absolute;
          top: -3px;
          right: -3px;
          min-width: 18px;
          height: 18px;
          border-radius: 999px;
          background-color: #B96B60;
          color: #FFFDF8;
          font-size: 0.66rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
        }

        .fac-topbar__profile-chip {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.3rem 0.65rem 0.3rem 0.35rem;
          border-radius: 999px;
          border: 1px solid #E3D8C9;
          background-color: #FFFDF8;
          text-decoration: none;
          color: #3D3228;
        }
        .fac-topbar__avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: #A67C52;
          color: #FFFDF8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.8rem;
        }
        .fac-topbar__profile-text strong {
          display: block;
          font-size: 0.76rem;
          line-height: 1.15;
        }
        .fac-topbar__profile-text span {
          display: block;
          font-size: 0.66rem;
          color: #82776B;
        }

        .fac-content {
          flex: 1;
          padding: clamp(1rem, 2.5vw, 1.85rem);
          max-width: 1440px;
          width: 100%;
          margin: 0 auto;
        }

        .fac-shell__backdrop {
          display: none;
        }

        @media (max-width: 1024px) {
          .fac-shell,
          .fac-shell--collapsed {
            grid-template-columns: minmax(0, 1fr);
          }

          .fac-sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            width: 278px;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }

          .fac-sidebar--open {
            transform: translateX(0);
          }

          .fac-sidebar__collapse-btn {
            display: none;
          }

          .fac-sidebar__close-mobile {
            display: inline-flex;
          }

          .fac-topbar__menu-btn {
            display: inline-flex;
          }

          .fac-shell__backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(61, 50, 40, 0.5);
            z-index: 80;
          }
        }

        @media (max-width: 720px) {
          .fac-topbar__search input {
            width: 155px;
          }
          .fac-topbar__profile-text {
            display: none;
          }
          .fac-topbar__report-btn span {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
