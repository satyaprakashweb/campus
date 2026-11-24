import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FileText,
  Clock,
  PackageCheck,
  Sparkles,
  ClipboardCheck,
  ShieldCheck,
  LayoutDashboard,
  Users,
  Package,
  Check,
  X,
  SlidersHorizontal,
  Download,
  QrCode,
  BarChart3,
  Eye,
  Plus,
  Printer,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  Tag,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortalData } from '../context/PortalDataContext';
import { api } from '../data/api';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import EmptyState from '../components/EmptyState';
import ItemImage from '../components/ItemImage';

export function AdminSubnav() {
  const location = useLocation();
  const links = [
    { to: '/admin/dashboard', matchPaths: ['/admin', '/admin/dashboard'], label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/analytics', matchPaths: ['/admin/analytics'], label: 'Analytics', icon: BarChart3 },
    { to: '/admin/users', matchPaths: ['/admin/users'], label: 'Users & Roles', icon: Users },
    { to: '/admin/items', matchPaths: ['/admin/items'], label: 'Items', icon: Package },
    { to: '/admin/matches', matchPaths: ['/admin/matches'], label: 'AI Matches', icon: Sparkles },
    { to: '/admin/claims', matchPaths: ['/admin/claims'], label: 'Claims & Handovers', icon: ClipboardCheck },
    { to: '/admin/reports', matchPaths: ['/admin/reports'], label: 'Reports & Audit', icon: FileText },
    { to: '/admin/settings', matchPaths: ['/admin/settings'], label: 'Settings', icon: SlidersHorizontal },
  ];

  return (
    <nav className="subnav" aria-label="Administrator quick navigation">
      {links.map((link) => {
        const Icon = link.icon;
        const active = link.matchPaths.includes(location.pathname);
        return (
          <Link
            key={link.to}
            to={link.to}
            className={`subnav__link ${active ? 'subnav__link--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={15} aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

const ACTIVITY_ICON = {
  report: FileText,
  match: Sparkles,
  claim: ClipboardCheck,
  verify: ShieldCheck,
  return: PackageCheck,
};

function downloadCsv(filename, headers, rows) {
  const escapeCell = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const csv = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sectionFromPathname(pathname) {
  if (pathname === '/admin/analytics') return 'analytics';
  if (pathname === '/admin/matches') return 'matches';
  if (pathname === '/admin/claims') return 'claims';
  if (pathname === '/admin/reports' || pathname === '/admin/logs' || pathname === '/admin/notifications') return 'audit';
  if (pathname === '/admin/settings') return 'config';
  return 'overview';
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const {
    items,
    claims,
    handovers,
    users,
    categories,
    aiMatches,
    auditLogs,
    matchingConfig,
    stats,
    activity,
    getMatchesForItem,
    reviewClaim,
    recordHandover,
    updateHandover,
    submitMatchFeedback,
    updateMatchingConfig,
    addCampusLocation,
  } = usePortalData();

  const [activeSection, setActiveSection] = useState(() =>
    sectionFromPathname(location.pathname)
  );
  const [evalMetrics, setEvalMetrics] = useState(null);

  useEffect(() => {
    setActiveSection(sectionFromPathname(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    api
      .getEvaluation()
      .then((res) => {
        if (!cancelled && res?.evaluation) {
          setEvalMetrics(res.evaluation);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Claim review modal state
  const [inspectingClaim, setInspectingClaim] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [scheduleDate, setScheduleDate] = useState(
    () => new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [scheduleTime, setScheduleTime] = useState('11:00');
  const [scheduleLoc, setScheduleLoc] = useState('Student Services Office, OUTR, Bhubaneswar');
  const [reviewError, setReviewError] = useState('');

  // Handover completion modal
  const [completingHo, setCompletingHo] = useState(null);
  const [receiverIdType, setReceiverIdType] = useState('Student ID');
  const [receiverIdNum, setReceiverIdNum] = useState('');
  const [hoNotes, setHoNotes] = useState('');

  // AI Matching Configuration form
  const [cfgThreshold, setCfgThreshold] = useState(matchingConfig.threshold ?? 0.3);
  const [cfgNotifyThreshold, setCfgNotifyThreshold] = useState(
    matchingConfig.notifyThreshold ?? 0.45
  );
  const [cfgTextWeight, setCfgTextWeight] = useState(matchingConfig.textWeight ?? 0.65);
  const [cfgContextWeight, setCfgContextWeight] = useState(matchingConfig.contextWeight ?? 0.35);
  const [cfgAlgo, setCfgAlgo] = useState(matchingConfig.defaultAlgorithm || 'sbert');
  const [newLocName, setNewLocName] = useState('');
  const [newLocBuilding, setNewLocBuilding] = useState('');

  // Gather all AI matches for Admin AI Match Management
  const allAdminMatches = useMemo(() => {
    if (Array.isArray(aiMatches) && aiMatches.length > 0) {
      return aiMatches;
    }
    const lostList = items.filter((i) => i.type === 'lost');
    const seen = new Set();
    const list = [];
    lostList.forEach((l) => {
      getMatchesForItem(l.id).forEach((m) => {
        const key = `${m.lostItemId}-${m.foundItemId}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push(m);
        }
      });
    });
    return list.sort((a, b) => b.score - a.score);
  }, [aiMatches, items, getMatchesForItem]);

  // Compute all 8 live database statistics
  const totalLost = stats?.totalLostReports ?? items.filter((i) => i.type === 'lost').length;
  const totalFound = stats?.totalFoundReports ?? items.filter((i) => i.type === 'found').length;
  const totalUsersCount = users.length || (stats?.totalStudents || 2) + (stats?.totalStaff || 2) + 1;
  const totalAdminsCount = users.filter((u) => u.role === 'admin').length || 1;
  const pendingClaimsCount =
    stats?.pendingClaims ??
    claims.filter((c) =>
      ['pending', 'under review', 'claim-pending'].includes(String(c.status).toLowerCase())
    ).length;
  const resolvedCasesCount = items.filter((i) =>
    ['returned', 'resolved'].includes(String(i.status).toLowerCase())
  ).length;
  const activeReportsCount = items.filter(
    (i) => !['returned', 'resolved', 'closed'].includes(String(i.status).toLowerCase())
  ).length;

  // Real Database Analytics Aggregations
  const analyticsData = useMemo(() => {
    // 1. Category distribution
    const catCounts = categories.map((c) => {
      const lostC = items.filter((i) => i.category === c.id && i.type === 'lost').length;
      const foundC = items.filter((i) => i.category === c.id && i.type === 'found').length;
      return { id: c.id, label: c.label, lost: lostC, found: foundC, total: lostC + foundC };
    });
    const maxCatTotal = Math.max(1, ...catCounts.map((c) => c.total));

    // 2. Most common campus locations
    const locMap = new Map();
    items.forEach((i) => {
      if (!i.location) return;
      locMap.set(i.location, (locMap.get(i.location) || 0) + 1);
    });
    const topLocations = Array.from(locMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    const maxLocCount = Math.max(1, ...topLocations.map((l) => l.count));

    // 3. Weekly / Daily reporting & recovery trend
    const dateMap = new Map();
    items.forEach((i) => {
      const d = (i.date || '').slice(0, 10) || '2026-11-18';
      if (!dateMap.has(d)) dateMap.set(d, { date: d, lost: 0, found: 0, recovered: 0 });
      const entry = dateMap.get(d);
      if (i.type === 'lost') entry.lost += 1;
      else entry.found += 1;
      if (['returned', 'resolved'].includes(String(i.status).toLowerCase())) {
        entry.recovered += 1;
      }
    });
    const timeline = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    const maxDayCount = Math.max(1, ...timeline.map((t) => t.lost + t.found));

    // 4. Match acceptance & feedback breakdown
    const approvedMatches = allAdminMatches.filter((m) => m.status === 'relevant').length;
    const rejectedMatches = allAdminMatches.filter(
      (m) => m.status === 'incorrect' || m.status === 'not_my_item'
    ).length;
    const activeMatches = allAdminMatches.length - approvedMatches - rejectedMatches;

    // 5. Claim verification breakdown
    const approvedClaims = claims.filter((c) =>
      ['approved', 'verified'].includes(String(c.status).toLowerCase())
    ).length;
    const rejectedClaims = claims.filter(
      (c) => String(c.status).toLowerCase() === 'rejected'
    ).length;

    return {
      catCounts,
      maxCatTotal,
      topLocations,
      maxLocCount,
      timeline,
      maxDayCount,
      approvedMatches,
      rejectedMatches,
      activeMatches,
      approvedClaims,
      rejectedClaims,
    };
  }, [items, categories, allAdminMatches, claims]);

  const openClaimInspect = (claim) => {
    setInspectingClaim(claim);
    setRejectReason(claim.adminReason || '');
    setReviewError('');
  };

  const handleModalClaimDecision = async (decision) => {
    if (!inspectingClaim) return;
    if (decision === 'reject' && !rejectReason.trim()) {
      setReviewError('Please enter a reason before rejecting this claim.');
      return;
    }
    await reviewClaim(inspectingClaim.id, decision, user?.name, {
      adminReason:
        rejectReason.trim() ||
        (decision === 'approve' ? 'Ownership evidence verified by administrator.' : ''),
      handoverLocation: scheduleLoc,
      scheduledDate: scheduleDate,
      scheduledTime: scheduleTime,
    });
    setInspectingClaim(null);
  };

  const handleConfirmHandoverComplete = async (e) => {
    e.preventDefault();
    if (!completingHo || !receiverIdNum.trim()) return;
    await recordHandover(completingHo.foundItemId, {
      claimId: completingHo.claimId,
      date: new Date().toISOString().split('T')[0],
      time: completingHo.scheduledTime || '11:00',
      location: completingHo.location || 'Student Services Office, OUTR, Bhubaneswar',
      receiverIdType,
      receiverId: receiverIdNum.trim(),
      notes: hoNotes.trim() || 'Verified campus ID and completed handover.',
    });
    setCompletingHo(null);
  };

  const handleSaveMatchingConfig = async (e) => {
    e.preventDefault();
    await updateMatchingConfig({
      threshold: Number(cfgThreshold),
      notifyThreshold: Number(cfgNotifyThreshold),
      textWeight: Number(cfgTextWeight),
      contextWeight: Number(cfgContextWeight),
      defaultAlgorithm: cfgAlgo,
    });
  };

  const handleExportReportsCsv = () => {
    downloadCsv(
      'campusfind-reports.csv',
      ['Report Code', 'Type', 'Title', 'Category', 'Color', 'Brand', 'Location', 'Date', 'Status'],
      items.map((i) => [
        i.reportCode || i.id,
        i.type,
        i.title,
        i.category,
        i.color || '',
        i.brand || '',
        i.location,
        i.date,
        i.status,
      ])
    );
  };

  const handleExportClaimsCsv = () => {
    downloadCsv(
      'campusfind-claims.csv',
      ['Claim Code', 'Item ID', 'Claimant', 'Contact', 'Status', 'Submitted At', 'Admin Remarks'],
      claims.map((c) => [
        c.claimCode || c.id,
        c.itemId,
        c.claimantName,
        c.contact,
        c.status,
        c.submittedAt,
        c.adminReason || '',
      ])
    );
  };

  const handleExportAuditCsv = () => {
    downloadCsv(
      'campusfind-audit-logs.csv',
      ['Timestamp', 'Actor', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Details'],
      auditLogs.map((a) => [
        a.createdAt,
        a.actorName,
        a.actorRole,
        a.action,
        a.entityType,
        a.entityId,
        a.details,
      ])
    );
  };

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem' }}>
            <div>
              <span className="eyebrow">OUTR Institutional Control Center</span>
              <h1>Admin Dashboard</h1>
              <p className="page-header__lead">
                Manage campus users, lost and found reports, multimodal AI matches, ownership claim
                verifications, analytics, and audit logs.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button variant="secondary" size="sm" onClick={handleExportReportsCsv}>
                <Download size={14} aria-hidden="true" /> Export Reports CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportClaimsCsv}>
                <Download size={14} aria-hidden="true" /> Export Claims CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportAuditCsv}>
                <Download size={14} aria-hidden="true" /> Export Audit CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Printer size={14} aria-hidden="true" /> Print / Save PDF
              </Button>
            </div>
          </div>
          <AdminSubnav />
        </div>
      </section>

      <section className="section section--compact">
        <div className="container">
          {/* 8 Live Animated Database Statistics Cards */}
          <div className="grid grid--4" style={{ marginBottom: '2rem' }}>
            <StatCard
              icon={Users}
              label="Total Registered Users"
              value={totalUsersCount}
              note="Students, faculty, staff & admins"
            />
            <StatCard
              icon={FileText}
              label="Total Lost Items"
              value={totalLost}
              note="Stored in lost_items table"
            />
            <StatCard
              icon={Package}
              label="Total Found Items"
              value={totalFound}
              note="Stored in found_items table"
            />
            <StatCard
              icon={Sparkles}
              label="Total Successful Matches"
              value={allAdminMatches.length}
              note="Multimodal AI matched pairs"
            />
            <StatCard
              icon={Clock}
              label="Pending Ownership Claims"
              value={pendingClaimsCount}
              note="Awaiting admin verification"
            />
            <StatCard
              icon={PackageCheck}
              label="Resolved Cases"
              value={resolvedCasesCount}
              note="Verified & returned items"
            />
            <StatCard
              icon={TrendingUp}
              label="Active Reports"
              value={activeReportsCount}
              note="Open lost & found cases"
            />
            <StatCard
              icon={ShieldCheck}
              label="Total Administrators"
              value={totalAdminsCount}
              note="Authorized admin accounts"
            />
          </div>

          {/* Admin Section Tabs */}
          <div className="subnav" style={{ marginTop: 0, marginBottom: '1.75rem' }} role="tablist">
            {[
              { id: 'overview', label: `Claims Verification (${claims.length})` },
              { id: 'analytics', label: 'Admin Analytics & Charts' },
              { id: 'matches', label: `AI Match Management (${allAdminMatches.length})` },
              { id: 'handovers', label: `Handover Management (${handovers.length})` },
              { id: 'config', label: 'Matching Configuration & Locations' },
              { id: 'audit', label: `Audit Logs (${auditLogs.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeSection === tab.id || (tab.id === 'overview' && activeSection === 'claims')}
                className={`subnav__link ${
                  activeSection === tab.id || (tab.id === 'overview' && activeSection === 'claims')
                    ? 'subnav__link--active'
                    : ''
                }`}
                onClick={() => setActiveSection(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* =================================================================
              SECTION 1: CLAIMS VERIFICATION QUEUE & OVERVIEW
              ================================================================= */}
          {(activeSection === 'overview' || activeSection === 'claims') && (
            <div className="admin-grid">
              <section aria-labelledby="queue-heading">
                <div style={{ marginBottom: '1.1rem' }}>
                  <span className="eyebrow">Ownership Verification</span>
                  <h2 id="queue-heading" style={{ fontSize: 'var(--text-2xl)' }}>
                    Claims Verification Queue
                  </h2>
                </div>

                {claims.length > 0 ? (
                  <div className="table-wrapper">
                    <div className="table-scroll">
                      <table className="table table--responsive">
                        <thead>
                          <tr>
                            <th>Claim ID</th>
                            <th>Item &amp; Evidence</th>
                            <th>Claimant</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {claims.map((claim) => {
                            const item = items.find((i) => i.id === claim.itemId);
                            const claimant = users.find((u) => u.id === claim.claimantId);
                            const stLower = String(claim.status).toLowerCase();
                            const isPending =
                              stLower === 'pending' ||
                              stLower === 'under review' ||
                              stLower === 'claim-pending';

                            return (
                              <tr key={claim.id}>
                                <td data-label="Claim" className="td--title">
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                    <strong>{claim.claimCode || claim.id}</strong>
                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)', whiteSpace: 'nowrap' }}>
                                      {new Date(claim.submittedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </td>
                                <td data-label="Item & Evidence" className="td--block">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                    {item && <ItemImage item={item} variant="thumb" />}
                                    <div>
                                      <div style={{ fontWeight: 600 }}>
                                        {item?.title || claim.itemId}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 'var(--text-xs)',
                                          color: 'var(--mocha-600)',
                                          maxWidth: '320px',
                                          marginTop: '0.15rem',
                                        }}
                                      >
                                        {claim.identifyingDetails}
                                      </div>
                                      {claim.uniqueFeatures && (
                                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--bronze-700)', marginTop: '0.1rem' }}>
                                          Features: {claim.uniqueFeatures}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td data-label="Claimant">
                                  <div>{claim.claimantName || claimant?.name || 'Campus Member'}</div>
                                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                                    {claimant?.identifier || claim.contact}
                                  </div>
                                </td>
                                <td data-label="Status">
                                  <Badge status={claim.status} />
                                </td>
                                <td data-label="Actions" className="td--actions">
                                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => openClaimInspect(claim)}
                                    >
                                      <Eye size={14} aria-hidden="true" /> Review
                                    </Button>
                                    {isPending && (
                                      <>
                                        <Button
                                          variant="success"
                                          size="sm"
                                          onClick={() =>
                                            reviewClaim(claim.id, 'approve', user?.name, {
                                              adminReason: 'Verified ownership evidence.',
                                            })
                                          }
                                        >
                                          <Check size={14} aria-hidden="true" /> Approve
                                        </Button>
                                        <Button
                                          variant="danger-outline"
                                          size="sm"
                                          onClick={() => openClaimInspect(claim)}
                                        >
                                          <X size={14} aria-hidden="true" /> Reject
                                        </Button>
                                      </>
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
                    icon={ClipboardCheck}
                    title="No claims in queue"
                    description="Submitted claims requiring verification will appear here."
                  />
                )}
              </section>

              {/* Recent Activity Feed */}
              <aside aria-labelledby="activity-heading">
                <div style={{ marginBottom: '1.1rem' }}>
                  <span className="eyebrow">Live Audit Stream</span>
                  <h2 id="activity-heading" style={{ fontSize: 'var(--text-2xl)' }}>
                    Recent Activity
                  </h2>
                </div>

                <Card compact>
                  <ul className="activity-list">
                    {activity.slice(0, 8).map((entry) => {
                      const Icon = ACTIVITY_ICON[entry.type] || FileText;
                      return (
                        <li key={entry.id} className="activity-list__item">
                          <span className="activity-list__icon" aria-hidden="true">
                            <Icon size={15} />
                          </span>
                          <div>
                            <p className="activity-list__msg">{entry.message}</p>
                            <span className="activity-list__time">{entry.time}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </aside>
            </div>
          )}

          {/* =================================================================
              SECTION 2: ADMIN ANALYTICS & INTERACTIVE CHARTS
              ================================================================= */}
          {activeSection === 'analytics' && (
            <section aria-labelledby="analytics-heading">
              <div style={{ marginBottom: '1.25rem' }}>
                <span className="eyebrow">Real-Time Database Telemetry</span>
                <h2 id="analytics-heading" style={{ fontSize: 'var(--text-2xl)' }}>
                  Campus Lost &amp; Found Analytics
                </h2>
              </div>

              <div className="grid grid--2" style={{ marginBottom: '1.5rem' }}>
                {/* Chart 1: Lost vs Found & Recovery Summary */}
                <Card>
                  <span className="eyebrow">Report Volume &amp; Recovery</span>
                  <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: '1rem' }}>
                    Lost vs. Found Items &amp; Resolution Rate
                  </h3>
                  <div className="analytics-bars">
                    <div className="analytics-bar-row">
                      <div className="analytics-bar-row__meta">
                        <span>Lost Item Reports</span>
                        <strong>{totalLost}</strong>
                      </div>
                      <div className="analytics-track">
                        <div
                          className="analytics-fill analytics-fill--lost"
                          style={{
                            width: `${Math.round((totalLost / Math.max(1, totalLost + totalFound)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="analytics-bar-row">
                      <div className="analytics-bar-row__meta">
                        <span>Found Item Reports</span>
                        <strong>{totalFound}</strong>
                      </div>
                      <div className="analytics-track">
                        <div
                          className="analytics-fill analytics-fill--found"
                          style={{
                            width: `${Math.round((totalFound / Math.max(1, totalLost + totalFound)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="analytics-bar-row">
                      <div className="analytics-bar-row__meta">
                        <span>Successfully Matched Pairs (AI)</span>
                        <strong>{allAdminMatches.length}</strong>
                      </div>
                      <div className="analytics-track">
                        <div
                          className="analytics-fill analytics-fill--match"
                          style={{
                            width: `${Math.min(100, Math.round((allAdminMatches.length / Math.max(1, totalLost)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="analytics-bar-row">
                      <div className="analytics-bar-row__meta">
                        <span>Verified &amp; Returned Items</span>
                        <strong>{resolvedCasesCount}</strong>
                      </div>
                      <div className="analytics-track">
                        <div
                          className="analytics-fill analytics-fill--found"
                          style={{
                            width: `${Math.min(100, Math.round((resolvedCasesCount / Math.max(1, totalFound)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Chart 2: Category-Wise Item Distribution */}
                <Card>
                  <span className="eyebrow"><Tag size={12} /> Category Breakdown</span>
                  <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: '1rem' }}>
                    Category-Wise Item Distribution
                  </h3>
                  <div className="analytics-bars">
                    {analyticsData.catCounts.map((cat) => (
                      <div key={cat.id} className="analytics-bar-row">
                        <div className="analytics-bar-row__meta">
                          <span>{cat.label}</span>
                          <strong>
                            {cat.total} ({cat.lost} Lost · {cat.found} Found)
                          </strong>
                        </div>
                        <div className="analytics-track">
                          <div
                            className="analytics-fill"
                            style={{
                              width: `${Math.max(8, Math.round((cat.total / analyticsData.maxCatTotal) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Chart 3: Most Common Campus Locations */}
                <Card>
                  <span className="eyebrow"><MapPin size={12} /> Spatial Hotspots</span>
                  <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: '1rem' }}>
                    Most Common Lost &amp; Found Locations
                  </h3>
                  <div className="analytics-bars">
                    {analyticsData.topLocations.map((loc) => (
                      <div key={loc.name} className="analytics-bar-row">
                        <div className="analytics-bar-row__meta">
                          <span>{loc.name}</span>
                          <strong>{loc.count} reports</strong>
                        </div>
                        <div className="analytics-track">
                          <div
                            className="analytics-fill analytics-fill--match"
                            style={{
                              width: `${Math.max(10, Math.round((loc.count / analyticsData.maxLocCount) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Chart 4: Weekly & Monthly Reporting Activity & Claim Verification */}
                <Card>
                  <span className="eyebrow">Timeline &amp; Verification Rates</span>
                  <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: '1rem' }}>
                    Reporting Activity &amp; Claim Verification Funnel
                  </h3>

                  <div className="analytics-timeline-grid" style={{ marginBottom: '1.25rem' }}>
                    {analyticsData.timeline.map((day) => {
                      const totalDay = day.lost + day.found;
                      const hPct = Math.max(18, Math.round((totalDay / analyticsData.maxDayCount) * 100));
                      return (
                        <div key={day.date} className="analytics-day-col">
                          <div className="analytics-day-col__bar-wrap">
                            <div
                              className="analytics-day-col__bar"
                              style={{ height: `${hPct}%` }}
                              title={`${day.date}: ${day.lost} Lost, ${day.found} Found, ${day.recovered} Recovered`}
                            />
                          </div>
                          <strong>{totalDay}</strong>
                          <span>{day.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="analytics-kpi-strip">
                    <div className="analytics-kpi">
                      <span>Approved Claims</span>
                      <strong>{analyticsData.approvedClaims}</strong>
                    </div>
                    <div className="analytics-kpi">
                      <span>Pending Claims</span>
                      <strong>{pendingClaimsCount}</strong>
                    </div>
                    <div className="analytics-kpi">
                      <span>Accepted AI Matches</span>
                      <strong>{analyticsData.approvedMatches + analyticsData.activeMatches}</strong>
                    </div>
                    <div className="analytics-kpi">
                      <span>Rejected Matches</span>
                      <strong>{analyticsData.rejectedMatches}</strong>
                    </div>
                  </div>
                </Card>
              </div>
            </section>
          )}

          {/* =================================================================
              SECTION 3: AI MATCH MANAGEMENT & EVALUATION METRICS
              ================================================================= */}
          {activeSection === 'matches' && (
            <section aria-labelledby="admin-matches-heading">
              <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span className="eyebrow">Multimodal AI Oversight</span>
                  <h2 id="admin-matches-heading" style={{ fontSize: 'var(--text-2xl)' }}>
                    AI Match Management &amp; Model Performance
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button to="/photo-match" variant="secondary" size="sm">
                    <Eye size={14} /> Open Photo Comparison Studio
                  </Button>
                  <Button to="/evaluation" variant="secondary" size="sm">
                    <BarChart3 size={14} /> Full Benchmark Report
                  </Button>
                </div>
              </div>

              {/* Precision@1, Precision@5, Recall@5, MRR Live Evaluation Cards */}
              {evalMetrics && (
                <div className="grid grid--4" style={{ marginBottom: '1.5rem' }}>
                  <Card compact>
                    <span className="eyebrow">Precision@1 (Top-1)</span>
                    <strong style={{ fontSize: '1.75rem', fontFamily: 'var(--font-serif)', display: 'block' }}>
                      {(evalMetrics.sbert.precisionAt1 * 100).toFixed(1)}%
                    </strong>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                      SBERT vs TF-IDF ({(evalMetrics.tfidf.precisionAt1 * 100).toFixed(1)}%)
                    </span>
                  </Card>
                  <Card compact>
                    <span className="eyebrow">Recall@5 (Hit Rate)</span>
                    <strong style={{ fontSize: '1.75rem', fontFamily: 'var(--font-serif)', display: 'block' }}>
                      {(evalMetrics.sbert.recallAt5 * 100).toFixed(1)}%
                    </strong>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                      {evalMetrics.sbert.hitsAt5}/{evalMetrics.sbert.totalQueries} ground-truth pairs
                    </span>
                  </Card>
                  <Card compact>
                    <span className="eyebrow">Mean Reciprocal Rank (MRR)</span>
                    <strong style={{ fontSize: '1.75rem', fontFamily: 'var(--font-serif)', display: 'block' }}>
                      {evalMetrics.sbert.mrr.toFixed(3)}
                    </strong>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                      Multimodal ranking quality
                    </span>
                  </Card>
                  <Card compact>
                    <span className="eyebrow">Precision@5</span>
                    <strong style={{ fontSize: '1.75rem', fontFamily: 'var(--font-serif)', display: 'block' }}>
                      {evalMetrics.sbert.precisionAt5.toFixed(3)}
                    </strong>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                      1 relevant pair per query
                    </span>
                  </Card>
                </div>
              )}

              {allAdminMatches.length > 0 ? (
                <div className="table-wrapper">
                  <div className="table-scroll">
                    <table className="table table--responsive">
                      <thead>
                        <tr>
                          <th>Lost &amp; Found Photographs</th>
                          <th>Matched Reports &amp; Explanation</th>
                          <th>Multimodal Scores</th>
                          <th>Status / Feedback</th>
                          <th>Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allAdminMatches.map((m) => (
                          <tr key={m.id}>
                            <td data-label="Photographs">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {m.lostItem && <ItemImage item={m.lostItem} variant="thumb" />}
                                <span style={{ fontWeight: 700, color: 'var(--bronze-700)' }}>↔</span>
                                {m.foundItem && <ItemImage item={m.foundItem} variant="thumb" />}
                              </div>
                            </td>
                            <td data-label="Reports & Explanation" className="td--block">
                              <div style={{ fontWeight: 700, color: 'var(--mocha-900)' }}>
                                {m.lostItem?.title} ↔ {m.foundItem?.title}
                              </div>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)', marginTop: '0.2rem', maxWidth: '360px' }}>
                                {m.matchingExplanation || (m.matchingReasons || [])[0] || 'Multimodal semantic & visual match'}
                              </div>
                            </td>
                            <td data-label="Multimodal Scores">
                              <div style={{ fontWeight: 700, color: 'var(--bronze-700)' }}>
                                Final: {Math.round((m.score || 0) * 100)}% ({m.strengthLabel})
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--mocha-600)' }}>
                                SBERT: {Number(m.sbertSimilarity || 0).toFixed(2)} · TF-IDF:{' '}
                                {Number(m.tfidfCosine || 0).toFixed(2)} · CLIP:{' '}
                                {m.clipImageScore != null ? Number(m.clipImageScore).toFixed(2) : 'N/A'}
                              </div>
                            </td>
                            <td data-label="Feedback Status">
                              <Badge status={m.status || 'active'}>
                                {m.status === 'relevant'
                                  ? 'Approved / Relevant'
                                  : m.status === 'incorrect'
                                  ? 'Rejected / Incorrect'
                                  : m.status === 'not_my_item'
                                  ? 'Not My Item'
                                  : 'Active Suggestion'}
                              </Badge>
                            </td>
                            <td data-label="Actions" className="td--actions">
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <Button
                                  to={`/photo-match/${encodeURIComponent(m.id)}`}
                                  variant="secondary"
                                  size="sm"
                                >
                                  <Eye size={13} /> Compare Photos
                                </Button>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() =>
                                    submitMatchFeedback(m.id, {
                                      feedbackType: 'relevant',
                                      lostItemId: m.lostItemId,
                                      foundItemId: m.foundItemId,
                                      comment: 'Approved by Administrator',
                                    })
                                  }
                                >
                                  <ThumbsUp size={13} /> Approve
                                </Button>
                                <Button
                                  variant="danger-outline"
                                  size="sm"
                                  onClick={() =>
                                    submitMatchFeedback(m.id, {
                                      feedbackType: 'incorrect',
                                      lostItemId: m.lostItemId,
                                      foundItemId: m.foundItemId,
                                      comment: 'Rejected by Administrator',
                                    })
                                  }
                                >
                                  <ThumbsDown size={13} /> Reject
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="No AI matches generated yet"
                  description="Matches will appear here automatically as lost and found items are reported."
                />
              )}
            </section>
          )}

          {/* =================================================================
              SECTION 4: HANDOVER MANAGEMENT
              ================================================================= */}
          {activeSection === 'handovers' && (
            <section aria-labelledby="handovers-heading">
              <div style={{ marginBottom: '1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span className="eyebrow">Physical Return &amp; Verification</span>
                  <h2 id="handovers-heading" style={{ fontSize: 'var(--text-2xl)' }}>
                    Item Handover Management
                  </h2>
                </div>
                <Button to="/admin/items" variant="secondary" size="sm">
                  Record Handover from Items List
                </Button>
              </div>

              {handovers.length > 0 ? (
                <div className="table-wrapper">
                  <div className="table-scroll">
                    <table className="table table--responsive">
                      <thead>
                        <tr>
                          <th>Handover Code</th>
                          <th>Item &amp; Owner</th>
                          <th>Location &amp; Schedule</th>
                          <th>QR Verification</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {handovers.map((ho) => {
                          const foundItem = items.find((i) => i.id === ho.foundItemId);
                          return (
                            <tr key={ho.id}>
                              <td data-label="Handover Code" className="td--title">
                                <strong>{ho.handoverCode}</strong>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                                  Approved: {ho.approvedDate}
                                </div>
                              </td>
                              <td data-label="Item & Owner" className="td--block">
                                <div style={{ fontWeight: 600 }}>{foundItem?.title || ho.foundItemId}</div>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                                  Owner: {ho.ownerName}
                                </div>
                              </td>
                              <td data-label="Location & Schedule">
                                <div>{ho.location}</div>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                                  {ho.scheduledDate} at {ho.scheduledTime}
                                </div>
                              </td>
                              <td data-label="QR Token">
                                <code style={{ fontSize: 'var(--text-xs)', backgroundColor: 'var(--sand-200)', padding: '0.2rem 0.45rem', borderRadius: '6px' }}>
                                  <QrCode size={12} style={{ verticalAlign: '-2px' }} /> {ho.qrToken}
                                </code>
                              </td>
                              <td data-label="Status">
                                <Badge status={ho.status} />
                              </td>
                              <td data-label="Actions" className="td--actions">
                                {ho.status !== 'Completed' ? (
                                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => {
                                        setCompletingHo(ho);
                                        setReceiverIdNum('');
                                        setHoNotes(ho.adminRemarks || '');
                                      }}
                                    >
                                      <PackageCheck size={14} /> Confirm Handover
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() =>
                                        updateHandover(ho.id, {
                                          status: 'Rescheduled',
                                          scheduledDate: new Date(Date.now() + 2 * 86400000)
                                            .toISOString()
                                            .split('T')[0],
                                        })
                                      }
                                    >
                                      Reschedule
                                    </Button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--verified-text)', fontWeight: 600 }}>
                                    Completed ({ho.completedDate})
                                  </span>
                                )}
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
                  icon={PackageCheck}
                  title="No scheduled handovers yet"
                  description="When an ownership claim is approved, a scheduled handover record with a QR verification token is automatically created here."
                />
              )}
            </section>
          )}

          {/* =================================================================
              SECTION 5: AI MATCHING CONFIGURATION & CAMPUS LOCATIONS
              ================================================================= */}
          {activeSection === 'config' && (
            <div className="grid grid--2">
              <Card>
                <span className="eyebrow">AI Engine Parameters</span>
                <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <SlidersHorizontal size={19} style={{ color: 'var(--bronze-700)' }} />
                  Matching Threshold &amp; Weights
                </h2>
                <form onSubmit={handleSaveMatchingConfig}>
                  <Select
                    id="cfg-algo"
                    label="Default Matching Algorithm"
                    options={[
                      { value: 'sbert', label: 'Multimodal (Sentence-BERT + CLIP Image + TF-IDF + Context)' },
                      { value: 'tfidf', label: 'TF-IDF Cosine + Contextual Filters (Baseline)' },
                    ]}
                    value={cfgAlgo}
                    onChange={(e) => setCfgAlgo(e.target.value)}
                  />
                  <div className="handover-modal-grid">
                    <Input
                      id="cfg-threshold"
                      label="Minimum Match Threshold (0.10 – 0.90)"
                      type="number"
                      step="0.05"
                      min="0.10"
                      max="0.90"
                      value={cfgThreshold}
                      onChange={(e) => setCfgThreshold(e.target.value)}
                    />
                    <Input
                      id="cfg-notify"
                      label="Auto-Notification Threshold"
                      type="number"
                      step="0.05"
                      min="0.20"
                      max="0.95"
                      value={cfgNotifyThreshold}
                      onChange={(e) => setCfgNotifyThreshold(e.target.value)}
                    />
                  </div>
                  <div className="handover-modal-grid">
                    <Input
                      id="cfg-text-weight"
                      label="Text / Semantic Weight"
                      type="number"
                      step="0.05"
                      min="0.20"
                      max="0.90"
                      value={cfgTextWeight}
                      onChange={(e) => setCfgTextWeight(e.target.value)}
                    />
                    <Input
                      id="cfg-ctx-weight"
                      label="Contextual Metadata Weight"
                      type="number"
                      step="0.05"
                      min="0.10"
                      max="0.80"
                      value={cfgContextWeight}
                      onChange={(e) => setCfgContextWeight(e.target.value)}
                    />
                  </div>
                  <Button type="submit" variant="primary">
                    Save Configuration &amp; Re-Sync AI Matches
                  </Button>
                </form>
              </Card>

              <Card>
                <span className="eyebrow">Campus Directory</span>
                <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: '1rem' }}>
                  Add Configurable Campus Location
                </h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newLocName.trim()) return;
                    await addCampusLocation(newLocName.trim(), newLocBuilding.trim());
                    setNewLocName('');
                    setNewLocBuilding('');
                  }}
                >
                  <Input
                    id="new-loc-name"
                    label="Location Name"
                    required
                    placeholder="e.g., Central Innovation Lab"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                  />
                  <Input
                    id="new-loc-bldg"
                    label="Building / Block Description"
                    placeholder="e.g., Innovation & Research Wing"
                    value={newLocBuilding}
                    onChange={(e) => setNewLocBuilding(e.target.value)}
                  />
                  <Button type="submit" variant="secondary">
                    <Plus size={15} /> Add Campus Location
                  </Button>
                </form>
              </Card>
            </div>
          )}

          {/* =================================================================
              SECTION 6: REPORTS & COMPLETE AUDIT LOGS
              ================================================================= */}
          {activeSection === 'audit' && (
            <section aria-labelledby="audit-logs-heading">
              <div style={{ marginBottom: '1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span className="eyebrow">Security &amp; Accountability</span>
                  <h2 id="audit-logs-heading" style={{ fontSize: 'var(--text-2xl)' }}>
                    System Audit Logs &amp; Exportable Reports
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button variant="secondary" size="sm" onClick={handleExportReportsCsv}>
                    <Download size={14} /> Export Items CSV
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleExportClaimsCsv}>
                    <Download size={14} /> Export Claims CSV
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleExportAuditCsv}>
                    <Download size={14} /> Export Audit Logs CSV
                  </Button>
                </div>
              </div>

              <div className="table-wrapper">
                <div className="table-scroll">
                  <table className="table table--responsive">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Actor</th>
                        <th>Action</th>
                        <th>Entity</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td data-label="Timestamp" style={{ whiteSpace: 'nowrap', fontSize: 'var(--text-xs)' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td data-label="Actor">
                            <strong>{log.actorName}</strong>{' '}
                            <Badge status={log.actorRole} />
                          </td>
                          <td data-label="Action">
                            <code>{log.action}</code>
                          </td>
                          <td data-label="Entity">
                            {log.entityType} ({log.entityId})
                          </td>
                          <td data-label="Details" className="td--block">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>

      {/* Claim Evidence Review & Decision Modal */}
      <Modal
        isOpen={Boolean(inspectingClaim)}
        onClose={() => setInspectingClaim(null)}
        title={`Review Ownership Claim · ${inspectingClaim?.claimCode || inspectingClaim?.id || ''}`}
      >
        {inspectingClaim && (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <Badge status={inspectingClaim.status} />
              <Badge variant="neutral">Claimant: {inspectingClaim.claimantName}</Badge>
            </div>

            <div className="alert alert--info" style={{ marginBottom: '1rem', flexDirection: 'column', gap: '0.4rem' }}>
              <div>
                <strong>Identification Details:</strong>
                <p style={{ margin: '0.15rem 0 0', fontSize: 'var(--text-sm)', color: 'var(--mocha-900)' }}>
                  {inspectingClaim.identifyingDetails}
                </p>
              </div>
              {inspectingClaim.uniqueFeatures && (
                <div>
                  <strong>Unique Features:</strong> {inspectingClaim.uniqueFeatures}
                </div>
              )}
              {inspectingClaim.claimReason && (
                <div>
                  <strong>Reason for Claim:</strong> {inspectingClaim.claimReason}
                </div>
              )}
              {inspectingClaim.purchaseDate && (
                <div>
                  <strong>Purchase / Issue Date:</strong> {inspectingClaim.purchaseDate}
                </div>
              )}
              {inspectingClaim.supportingInfo && (
                <div>
                  <strong>Supporting Info:</strong> {inspectingClaim.supportingInfo}
                </div>
              )}
            </div>

            {inspectingClaim.proofPhoto && (
              <div style={{ marginBottom: '1rem' }}>
                <span className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Supporting Proof Attachment
                </span>
                <img
                  src={inspectingClaim.proofPhoto}
                  alt="Claimant proof"
                  style={{ maxHeight: '180px', borderRadius: 'var(--radius-md)', border: '1px solid var(--sand-300)' }}
                />
              </div>
            )}

            <div className="handover-modal-grid">
              <Input
                id="rev-sched-date"
                label="Schedule Handover Date (If Approved)"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
              <Input
                id="rev-sched-time"
                label="Handover Time"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>

            <Input
              id="rev-sched-loc"
              label="Handover Location"
              value={scheduleLoc}
              onChange={(e) => setScheduleLoc(e.target.value)}
            />

            <Input
              id="rev-admin-reason"
              label="Administrator Verification Remarks / Rejection Reason"
              multiline
              rows={2}
              placeholder="Required when rejecting a claim; optional verification note when approving..."
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                setReviewError('');
              }}
              error={reviewError}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => setInspectingClaim(null)}>
                Close
              </Button>
              <Button variant="danger" onClick={() => handleModalClaimDecision('reject')}>
                <X size={15} /> Reject Claim
              </Button>
              <Button variant="success" onClick={() => handleModalClaimDecision('approve')}>
                <Check size={15} /> Approve &amp; Schedule Handover
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Complete Scheduled Handover Modal */}
      <Modal
        isOpen={Boolean(completingHo)}
        onClose={() => setCompletingHo(null)}
        title={`Confirm Handover · ${completingHo?.handoverCode || ''}`}
      >
        {completingHo && (
          <form onSubmit={handleConfirmHandoverComplete}>
            <div className="alert alert--info" style={{ marginBottom: '1rem' }}>
              <div>
                <strong>Recipient: {completingHo.ownerName}</strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: 'var(--text-xs)' }}>
                  QR Verification Token: <code>{completingHo.qrToken}</code>
                </p>
              </div>
            </div>

            <Select
              id="ho-id-type"
              label="Recipient ID Verified"
              options={['Student ID', 'Employee / Staff ID', 'Government Photo ID']}
              value={receiverIdType}
              onChange={(e) => setReceiverIdType(e.target.value)}
            />

            <Input
              id="ho-id-num"
              label="Recipient ID / Roll Number"
              required
              placeholder="e.g., 23110307"
              value={receiverIdNum}
              onChange={(e) => setReceiverIdNum(e.target.value)}
            />

            <Input
              id="ho-remarks"
              label="Handover Remarks"
              multiline
              rows={2}
              value={hoNotes}
              onChange={(e) => setHoNotes(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <Button type="button" variant="secondary" onClick={() => setCompletingHo(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                <PackageCheck size={15} /> Mark Handover Completed &amp; Returned
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <style>{`
        .admin-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          align-items: start;
        }

        @media (min-width: 1120px) {
          .admin-grid {
            grid-template-columns: 1.55fr 0.85fr;
          }
        }

        .handover-modal-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0 1rem;
        }

        @media (min-width: 520px) {
          .handover-modal-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .activity-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .activity-list__item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--sand-300);
        }

        .activity-list__item:last-child {
          padding-bottom: 0;
          border-bottom: none;
        }

        .activity-list__icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background-color: var(--sand-200);
          color: var(--bronze-700);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .activity-list__msg {
          font-size: var(--text-sm);
          color: var(--mocha-900);
          margin: 0 0 0.15rem;
          line-height: 1.45;
        }

        .activity-list__time {
          font-size: var(--text-xs);
          color: var(--mocha-600);
        }

        /* Analytics Charts */
        .analytics-bars {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .analytics-bar-row__meta {
          display: flex;
          justify-content: space-between;
          font-size: var(--text-xs);
          margin-bottom: 0.3rem;
          color: var(--mocha-900);
        }

        .analytics-track {
          height: 9px;
          background-color: var(--sand-200);
          border-radius: 999px;
          overflow: hidden;
        }

        .analytics-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--bronze-500), var(--bronze-700));
          border-radius: 999px;
        }

        .analytics-fill--lost {
          background: linear-gradient(90deg, #B96B60, #8A392F);
        }

        .analytics-fill--found {
          background: linear-gradient(90deg, #6F8B70, #466044);
        }

        .analytics-fill--match {
          background: linear-gradient(90deg, #C4A484, #896642);
        }

        .analytics-timeline-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(44px, 1fr));
          gap: 0.5rem;
          align-items: end;
          height: 140px;
          padding: 0.75rem;
          background-color: var(--cream-100);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
        }

        .analytics-day-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          justify-content: flex-end;
          gap: 0.2rem;
        }

        .analytics-day-col__bar-wrap {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .analytics-day-col__bar {
          width: 22px;
          border-radius: 6px 6px 2px 2px;
          background: linear-gradient(180deg, var(--bronze-500), var(--bronze-700));
        }

        .analytics-day-col strong {
          font-size: 0.72rem;
          color: var(--mocha-900);
        }

        .analytics-day-col span {
          font-size: 0.65rem;
          color: var(--mocha-600);
        }

        .analytics-kpi-strip {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.6rem;
        }

        @media (min-width: 600px) {
          .analytics-kpi-strip {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .analytics-kpi {
          background-color: var(--cream-100);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
          padding: 0.6rem 0.75rem;
          display: flex;
          flex-direction: column;
        }

        .analytics-kpi span {
          font-size: 0.68rem;
          color: var(--mocha-600);
          text-transform: uppercase;
          font-weight: 600;
        }

        .analytics-kpi strong {
          font-family: var(--font-serif);
          font-size: 1.35rem;
          color: var(--mocha-900);
        }
      `}</style>
    </div>
  );
}
