import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Sparkles,
  FileText,
  ClipboardCheck,
  Search,
  ArrowRight,
  Calendar,
  MapPin,
  Bell,
  CheckCheck,
  User,
  Edit3,
  XCircle,
  CheckCircle2,
  Clock,
  PackageCheck,
  Settings,
  Image as ImageIcon,
  Eye,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortalData } from '../context/PortalDataContext';
import { getCategoryLabel } from '../data/mockData';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import MatchCard from '../components/MatchCard';
import ItemImage from '../components/ItemImage';
import EmptyState from '../components/EmptyState';
import MatchingMethodToggle from '../components/MatchingMethodToggle';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    items,
    claims,
    notifications,
    getMatchesForItem,
    updateItemStatus,
    submitMatchFeedback,
    markNotificationRead,
    markAllNotificationsRead,
  } = usePortalData();

  const [activeTab, setActiveTab] = useState('all');
  const [algorithm, setAlgorithm] = useState('sbert');
  const [matchModeFilter, setMatchModeFilter] = useState('multimodal');

  const recentlyViewedItems = useMemo(() => {
    try {
      const raw = localStorage.getItem('campusfind_recently_viewed');
      const ids = raw ? JSON.parse(raw) : [];
      const found = ids.map((id) => items.find((i) => i.id === id)).filter(Boolean);
      return found.length > 0 ? found : items.slice(0, 3);
    } catch {
      return items.slice(0, 3);
    }
  }, [items]);

  const myReports = useMemo(
    () => items.filter((item) => item.userId === user?.id),
    [items, user]
  );

  const myLostCount = useMemo(
    () => myReports.filter((i) => i.type === 'lost').length,
    [myReports]
  );

  const myFoundCount = useMemo(
    () => myReports.filter((i) => i.type === 'found').length,
    [myReports]
  );

  const suggestedMatches = useMemo(() => {
    const collected = [];
    const seen = new Set();
    myReports.forEach((report) => {
      const reportMatches = getMatchesForItem(report.id, { algorithm });
      reportMatches.forEach((m) => {
        const key = `${m.lostItemId}-${m.foundItemId}`;
        if (!seen.has(key)) {
          seen.add(key);
          collected.push({ ...m, sourceReport: report });
        }
      });
    });
    return collected.sort((a, b) => b.score - a.score);
  }, [myReports, getMatchesForItem, algorithm]);

  const myClaims = useMemo(
    () => claims.filter((c) => c.claimantId === user?.id),
    [claims, user]
  );

  const pendingClaimsCount = useMemo(
    () =>
      myClaims.filter((c) =>
        ['pending', 'under review', 'claim-pending'].includes(String(c.status).toLowerCase())
      ).length,
    [myClaims]
  );

  const approvedClaimsCount = useMemo(
    () =>
      myClaims.filter((c) =>
        ['approved', 'verified'].includes(String(c.status).toLowerCase())
      ).length,
    [myClaims]
  );

  const returnedCount = useMemo(() => {
    const returnedReports = myReports.filter((r) =>
      ['returned', 'resolved'].includes(String(r.status).toLowerCase())
    ).length;
    const returnedClaims = myClaims.filter(
      (c) => c.handover?.status === 'Completed' || String(c.status).toLowerCase() === 'returned'
    ).length;
    return Math.max(returnedReports, returnedClaims);
  }, [myReports, myClaims]);

  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  // Student-scoped AI Matching Metrics (strictly scoped to the logged-in user's reports)
  const oppositePoolForMyLost = items.filter((i) => i.type === 'found').length;
  const oppositePoolForMyFound = items.filter((i) => i.type === 'lost').length;
  const totalTextComparisons =
    myLostCount * oppositePoolForMyLost + myFoundCount * oppositePoolForMyFound;
  const myReportsWithPhoto = myReports.filter((r) => Boolean(r.photo)).length;
  const totalImageComparisons =
    myReportsWithPhoto * items.filter((i) => i.userId !== user?.id && Boolean(i.photo)).length;

  const potentialVisualMatchesCount = useMemo(
    () =>
      suggestedMatches.filter(
        (m) => m.clipImageScore !== null && m.clipImageScore !== undefined && m.clipImageScore >= 0.45
      ).length,
    [suggestedMatches]
  );

  const highRankingMatchesCount = useMemo(
    () => suggestedMatches.filter((m) => (m.score || 0) >= 0.7).length,
    [suggestedMatches]
  );

  const filteredSuggestedMatches = useMemo(() => {
    let list = [...suggestedMatches];
    if (matchModeFilter === 'image') {
      list = list.filter((m) => m.clipImageScore !== null && m.clipImageScore !== undefined);
      list.sort((a, b) => (b.clipImageScore || 0) - (a.clipImageScore || 0));
    } else if (matchModeFilter === 'text') {
      list.sort((a, b) => (b.sbertSimilarity || 0) - (a.sbertSimilarity || 0));
    } else if (matchModeFilter === 'highest') {
      list = list.filter((m) => (m.score || 0) >= 0.6);
      list.sort((a, b) => b.score - a.score);
    } else if (matchModeFilter === 'newest') {
      list.sort((a, b) =>
        String(b.matchedItem?.date || b.createdAt).localeCompare(
          String(a.matchedItem?.date || a.createdAt)
        )
      );
    } else {
      list.sort((a, b) => b.score - a.score);
    }
    return list;
  }, [suggestedMatches, matchModeFilter]);

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <div className="dash-welcome-grid">
            <div>
              <span className="eyebrow">
                Student Dashboard · Roll No. {user?.identifier}
              </span>
              <h1>Welcome back, {user?.name}</h1>
              <p className="page-header__lead">
                {user?.department ? `${user.department} · ` : ''}
                {user?.course ? `${user.course} · ` : ''}
                {user?.semester || user?.email}
              </p>

              {/* Dedicated Student Navigation Bar */}
              <div className="dash-actions" aria-label="Student Portal Navigation">
                <Button to="/dashboard" variant="primary">
                  Dashboard
                </Button>
                <Button to="/report?type=lost" variant="secondary">
                  <PlusCircle size={16} aria-hidden="true" /> Report Lost Item
                </Button>
                <Button to="/report?type=found" variant="secondary">
                  <PlusCircle size={16} aria-hidden="true" /> Report Found Item
                </Button>
                <Button to="/browse" variant="secondary">
                  <Search size={16} aria-hidden="true" /> Browse Items
                </Button>
                <Button to="/matches" variant="secondary">
                  <Sparkles size={16} aria-hidden="true" /> AI Matches
                </Button>
                <a href="#student-claims-section" className="btn btn--secondary btn--md">
                  <ClipboardCheck size={16} aria-hidden="true" /> My Claims ({myClaims.length})
                </a>
                <a href="#student-notif-section" className="btn btn--secondary btn--md">
                  <Bell size={16} aria-hidden="true" /> Notifications ({unreadNotifCount})
                </a>
                <Button to="/profile" variant="ghost">
                  <User size={16} aria-hidden="true" /> My Profile
                </Button>
                <Button to="/profile" variant="ghost">
                  <Settings size={16} aria-hidden="true" /> Settings
                </Button>
              </div>
            </div>

            {/* Profile Summary Card */}
            <Card compact className="dash-profile-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                <div className="dash-profile-avatar">
                  {user?.avatar ? <img src={user.avatar} alt="" /> : <User size={20} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--mocha-900)' }}>
                    {user?.name}
                  </strong>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                    {user?.email}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.65rem' }}>
                <Badge status={user?.role} />
                <Badge variant="neutral">ID: {user?.identifier}</Badge>
              </div>
              <Link to="/profile" style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                Edit profile &amp; password →
              </Link>
            </Card>
          </div>
        </div>
      </section>

      <section className="section section--compact">
        <div className="container">
          {/* 6 Live Database Stat Cards */}
          <div className="dash-stats-grid" style={{ marginBottom: '2rem' }}>
            <StatCard
              icon={FileText}
              label="Lost Items Reported"
              value={myLostCount}
              note="From your database records"
            />
            <StatCard
              icon={FileText}
              label="Found Items Reported"
              value={myFoundCount}
              note="From your database records"
            />
            <StatCard
              icon={Sparkles}
              label="AI Potential Matches"
              value={suggestedMatches.length}
              note="Ranked opposite-type pairs"
            />
            <StatCard
              icon={Clock}
              label="Pending Claims"
              value={pendingClaimsCount}
              note="Awaiting verification"
            />
            <StatCard
              icon={CheckCircle2}
              label="Approved Claims"
              value={approvedClaimsCount}
              note="Verified by administrator"
            />
            <StatCard
              icon={PackageCheck}
              label="Returned Items"
              value={returnedCount}
              note="Completed handovers"
            />
          </div>

          {/* Section Switcher (Strictly Student-Focused) */}
          <div
            className="subnav"
            style={{ marginTop: 0, marginBottom: '2rem' }}
            role="tablist"
            aria-label="Student Dashboard sections"
          >
            {[
              { id: 'all', label: 'My Dashboard' },
              { id: 'reports', label: `My Recent Activities (${myReports.length})` },
              { id: 'lost', label: `My Lost Reports (${myLostCount})` },
              { id: 'found', label: `My Found Reports (${myFoundCount})` },
              { id: 'matches', label: `My AI Matches (${suggestedMatches.length})` },
              { id: 'claims', label: `My Ownership Claims (${myClaims.length})` },
              { id: 'notifications', label: `Notifications (${unreadNotifCount} unread)` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`subnav__link ${activeTab === tab.id ? 'subnav__link--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="dash-panels">
            {/* Section 1: My Recent Activities / My Lost Reports / My Found Reports */}
            {(activeTab === 'all' || activeTab === 'reports' || activeTab === 'lost' || activeTab === 'found') && (
              <section aria-labelledby="my-reports-heading">
                <div className="dash-section-head">
                  <div>
                    <span className="eyebrow">My Recent Activities</span>
                    <h2 id="my-reports-heading" style={{ fontSize: 'var(--text-2xl)' }}>
                      {activeTab === 'lost'
                        ? 'My Lost Item Reports'
                        : activeTab === 'found'
                        ? 'My Found Item Reports'
                        : 'Submitted Lost & Found Reports'}
                    </h2>
                  </div>
                  <Button to="/report" variant="secondary" size="sm">
                    <PlusCircle size={14} aria-hidden="true" /> New Report
                  </Button>
                </div>

                {myReports.filter((r) =>
                  activeTab === 'lost' ? r.type === 'lost' : activeTab === 'found' ? r.type === 'found' : true
                ).length > 0 ? (
                  <div className="grid grid--2">
                    {myReports
                      .filter((r) =>
                        activeTab === 'lost'
                          ? r.type === 'lost'
                          : activeTab === 'found'
                          ? r.type === 'found'
                          : true
                      )
                      .map((item) => {
                      const stLower = String(item.status || '').toLowerCase();
                      const isClosed =
                        stLower === 'closed' || stLower === 'returned' || stLower === 'resolved';
                      return (
                        <Card key={item.id} hover compact className="dash-report-card">
                          <div className="dash-report-card__head">
                            <ItemImage item={item} variant="thumb" />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.45rem' }}>
                                <Badge status={item.type} />
                                {item.status && <Badge status={item.status} />}
                                {item.reportCode && <Badge variant="neutral">{item.reportCode}</Badge>}
                              </div>
                              <h3 style={{ fontSize: 'var(--text-xl)', lineHeight: 1.25 }}>
                                <Link to={`/items/${item.id}`} style={{ color: 'var(--mocha-900)' }}>
                                  {item.title}
                                </Link>
                              </h3>
                            </div>
                          </div>
                          <p className="dash-report-card__desc">{item.description}</p>

                          <div className="dash-meta">
                            <span>{getCategoryLabel(item.category)}</span>
                            <span><MapPin size={14} aria-hidden="true" /> {item.location}</span>
                            <span><Calendar size={14} aria-hidden="true" /> {item.date}</span>
                          </div>

                          <div className="dash-card-footer">
                            <Button to={`/matches/${item.id}`} variant="primary" size="sm">
                              <Sparkles size={14} aria-hidden="true" /> AI Matches
                            </Button>
                            <Button to={`/items/${item.id}`} variant="secondary" size="sm">
                              Details
                            </Button>
                            {!isClosed && (
                              <>
                                <Button to={`/report?edit=${item.id}`} variant="ghost" size="sm">
                                  <Edit3 size={14} aria-hidden="true" /> Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateItemStatus(item.id, 'Closed')}
                                >
                                  <XCircle size={14} aria-hidden="true" /> Close
                                </Button>
                              </>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={FileText}
                    title="No reports submitted yet"
                    description="When you report a lost or found item on campus, it will appear here along with automatic AI match alerts."
                    action={
                      <Button to="/report" variant="primary">
                        Report an Item
                      </Button>
                    }
                  />
                )}
              </section>
            )}

            {/* Section 2: My AI Matches & Visual Matching Dashboard */}
            {(activeTab === 'all' || activeTab === 'matches') && (
              <section aria-labelledby="suggested-matches-heading">
                <div className="dash-section-head">
                  <div>
                    <span className="eyebrow">Multimodal Computer Vision + NLP</span>
                    <h2 id="suggested-matches-heading" style={{ fontSize: 'var(--text-2xl)' }}>
                      AI Matching Dashboard &amp; Visual Pairs
                    </h2>
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button to="/photo-match" variant="secondary" size="sm">
                      <Eye size={14} aria-hidden="true" /> Animated Photo Matcher
                    </Button>
                    <MatchingMethodToggle value={algorithm} onChange={setAlgorithm} />
                  </div>
                </div>

                {/* Visual & Multimodal AI Matching Metrics Strip */}
                <Card sand compact style={{ marginBottom: '1.25rem' }}>
                  <div className="dash-ai-metrics-grid">
                    <div className="dash-ai-metric">
                      <span><ImageIcon size={14} aria-hidden="true" /> Total Image Comparisons</span>
                      <strong>{totalImageComparisons}</strong>
                      <small>CLIP ViT-B/32 512-d vectors</small>
                    </div>
                    <div className="dash-ai-metric">
                      <span><FileText size={14} aria-hidden="true" /> Total Text Comparisons</span>
                      <strong>{totalTextComparisons}</strong>
                      <small>Sentence-BERT &amp; TF-IDF</small>
                    </div>
                    <div className="dash-ai-metric">
                      <span><Cpu size={14} aria-hidden="true" /> Potential Visual Matches</span>
                      <strong>{potentialVisualMatchesCount}</strong>
                      <small>CLIP cosine ≥ 45%</small>
                    </div>
                    <div className="dash-ai-metric">
                      <span><Sparkles size={14} aria-hidden="true" /> High-Ranking Matches</span>
                      <strong>{highRankingMatchesCount}</strong>
                      <small>Combined score ≥ 70%</small>
                    </div>
                  </div>

                  {/* Recently Matched Photographs Strip */}
                  {suggestedMatches.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--sand-300)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bronze-700)' }}>
                          Recently Matched Photographs
                        </strong>
                        <Link to="/photo-match" style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                          Open full AI Photo Comparison →
                        </Link>
                      </div>
                      <div className="dash-recent-photos-strip">
                        {suggestedMatches.slice(0, 3).map((m) => {
                          const lItem = m.lostItem || m.sourceReport;
                          const fItem = m.foundItem || m.matchedItem;
                          return (
                            <Link
                              key={`photo-pair-${m.id}`}
                              to={`/photo-match/${encodeURIComponent(m.id)}`}
                              className="dash-photo-pair-pill"
                            >
                              <div className="dash-photo-pair-thumbs">
                                {lItem && <ItemImage item={lItem} variant="thumb" />}
                                <span className="dash-photo-pair-connector">↔</span>
                                {fItem && <ItemImage item={fItem} variant="thumb" />}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <strong style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--mocha-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {lItem?.title} ↔ {fItem?.title}
                                </strong>
                                <span style={{ fontSize: '0.7rem', color: 'var(--bronze-700)', fontWeight: 700 }}>
                                  {Math.round((m.score || 0) * 100)}% Multimodal
                                  {m.clipImageScore !== null && m.clipImageScore !== undefined
                                    ? ` · ${Math.round(m.clipImageScore * 100)}% CLIP Image`
                                    : ''}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Modality & Ranking Filters */}
                <div className="dash-match-filters" role="group" aria-label="Filter AI matches by modality and ranking">
                  {[
                    { id: 'multimodal', label: 'Multimodal Matches' },
                    { id: 'image', label: 'Image Matches (CLIP)' },
                    { id: 'text', label: 'Text Matches (SBERT)' },
                    { id: 'highest', label: 'Highest Ranking' },
                    { id: 'newest', label: 'Newest Matches' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`ai-stage-pill ${matchModeFilter === f.id ? 'ai-stage-pill--active' : ''}`}
                      onClick={() => setMatchModeFilter(f.id)}
                      aria-pressed={matchModeFilter === f.id}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {filteredSuggestedMatches.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredSuggestedMatches.map((m, idx) => (
                      <div key={m.id}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.45rem' }}>
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)', margin: 0 }}>
                            Matched against your report:{' '}
                            <strong style={{ color: 'var(--mocha-900)' }}>{m.sourceReport?.title}</strong>
                          </p>
                          <div style={{ display: 'flex', gap: '0.85rem' }}>
                            <Link
                              to={`/photo-match/${encodeURIComponent(m.id)}`}
                              style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}
                            >
                              Animated photo match →
                            </Link>
                            <Link
                              to={`/matches/${m.sourceReport?.id}`}
                              style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}
                            >
                              Compare &amp; filter matches →
                            </Link>
                          </div>
                        </div>
                        <MatchCard
                          match={m}
                          rank={idx + 1}
                          onFeedback={(matchObj, fbType) =>
                            submitMatchFeedback(matchObj.id, {
                              feedbackType: fbType,
                              lostItemId: matchObj.lostItemId,
                              foundItemId: matchObj.foundItemId,
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Sparkles}
                    title="No AI matches for this filter"
                    description="Once opposite-type reports align visually, semantically, or contextually, ranked matches will appear here automatically."
                  />
                )}
              </section>
            )}

            {/* Section 3: My Pending & Active Claims */}
            {(activeTab === 'all' || activeTab === 'claims') && (
              <section aria-labelledby="my-claims-heading">
                <div className="dash-section-head">
                  <div>
                    <span className="eyebrow">Ownership Verification &amp; Handover</span>
                    <h2 id="my-claims-heading" style={{ fontSize: 'var(--text-2xl)' }}>
                      My Ownership Claims
                    </h2>
                  </div>
                </div>

                {myClaims.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {myClaims.map((claim) => {
                      const claimedItem = items.find((i) => i.id === claim.itemId);
                      return (
                        <Card key={claim.id} hover compact className="dash-claim-card">
                          <div className="dash-claim-card__main dash-claim-card__head">
                            {claimedItem && <ItemImage item={claimedItem} variant="thumb" />}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                                <Badge status={claim.status} />
                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                                  {claim.claimCode || claim.id}
                                </span>
                                {claim.handover && (
                                  <Badge status={claim.handover.status}>
                                    Handover: {claim.handover.status}
                                  </Badge>
                                )}
                              </div>
                              <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: '0.35rem' }}>
                                {claimedItem?.title || `Item ${claim.itemId}`}
                              </h3>
                              <p style={{ fontSize: 'var(--text-sm)', marginBottom: '0.35rem' }}>
                                {claim.identifyingDetails}
                              </p>
                              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)', margin: 0 }}>
                                Submitted: {new Date(claim.submittedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="dash-claim-card__action">
                            <Button to={`/claims/${claim.id}`} variant="secondary" size="sm">
                              Track Status <ArrowRight size={14} aria-hidden="true" />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={ClipboardCheck}
                    title="No claims submitted"
                    description="When you recognize your belonging in Browse Items or AI Match Results and submit an ownership claim, you can track verification here."
                    action={
                      <Button to="/browse" variant="secondary">
                        Browse Campus Items
                      </Button>
                    }
                  />
                )}
              </section>
            )}

            {/* Section 4: Notifications Center */}
            {(activeTab === 'all' || activeTab === 'notifications') && (
              <section aria-labelledby="my-notifs-heading">
                <div className="dash-section-head">
                  <div>
                    <span className="eyebrow">Notification Center</span>
                    <h2 id="my-notifs-heading" style={{ fontSize: 'var(--text-2xl)' }}>
                      Updates &amp; Match Alerts
                    </h2>
                  </div>
                  {unreadNotifCount > 0 && (
                    <Button variant="secondary" size="sm" onClick={() => markAllNotificationsRead()}>
                      <CheckCheck size={14} aria-hidden="true" /> Mark All Read
                    </Button>
                  )}
                </div>

                {notifications.length > 0 ? (
                  <Card compact>
                    <ul className="dash-notif-list">
                      {notifications.map((n) => (
                        <li
                          key={n.id}
                          className={`dash-notif-item ${!n.isRead ? 'dash-notif-item--unread' : ''}`}
                        >
                          <span className="dash-notif-icon" aria-hidden="true">
                            <Bell size={16} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--mocha-900)' }}>
                                {n.title}
                              </strong>
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                                {new Date(n.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p style={{ fontSize: 'var(--text-sm)', margin: '0.2rem 0 0.45rem' }}>
                              {n.message}
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                              {n.link && (
                                <button
                                  type="button"
                                  className="dash-notif-action"
                                  onClick={() => {
                                    markNotificationRead(n.id);
                                    navigate(n.link);
                                  }}
                                >
                                  View details →
                                </button>
                              )}
                              {!n.isRead && (
                                <button
                                  type="button"
                                  className="dash-notif-action"
                                  onClick={() => markNotificationRead(n.id)}
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ) : (
                  <EmptyState
                    icon={Bell}
                    title="No notifications yet"
                    description="Important updates about your reports, AI matches, and claim verification decisions will appear here."
                  />
                )}
              </section>
            )}

            {/* Section 5: Recently Viewed Campus Items */}
            {activeTab === 'all' && recentlyViewedItems.length > 0 && (
              <section aria-labelledby="recently-viewed-heading">
                <div className="dash-section-head">
                  <div>
                    <span className="eyebrow">Browsing History</span>
                    <h2 id="recently-viewed-heading" style={{ fontSize: 'var(--text-2xl)' }}>
                      Recently Viewed Items
                    </h2>
                  </div>
                  <Button to="/browse" variant="ghost" size="sm">
                    Browse All Items →
                  </Button>
                </div>
                <div className="grid grid--3">
                  {recentlyViewedItems.slice(0, 3).map((rv) => (
                    <Card key={`rv-${rv.id}`} hover compact>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <ItemImage item={rv} variant="thumb" />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.25rem' }}>
                            <Badge status={rv.type} />
                            <Badge status={rv.status} />
                          </div>
                          <strong style={{ display: 'block', fontSize: 'var(--text-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <Link to={`/items/${rv.id}`} style={{ color: 'var(--mocha-900)' }}>
                              {rv.title}
                            </Link>
                          </strong>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                            {rv.location} · {rv.date}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </section>

      <style>{`
        .dash-welcome-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        @media (min-width: 1024px) {
          .dash-welcome-grid {
            grid-template-columns: 1fr 290px;
          }
        }

        .dash-profile-card {
          background-color: var(--cream-50);
        }

        .dash-profile-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background-color: var(--sand-200);
          color: var(--bronze-700);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .dash-profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .dash-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        @media (min-width: 768px) {
          .dash-stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 1180px) {
          .dash-stats-grid {
            grid-template-columns: repeat(6, 1fr);
          }
        }

        .dash-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          margin-top: 1.25rem;
        }

        .dash-panels {
          display: flex;
          flex-direction: column;
          gap: 3rem;
        }

        .dash-section-head {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .dash-report-card {
          display: flex;
          flex-direction: column;
        }

        .dash-report-card__head {
          display: flex;
          gap: 0.9rem;
          align-items: flex-start;
          margin-bottom: 0.75rem;
        }

        .dash-report-card__desc {
          font-size: var(--text-sm);
          margin-bottom: 0.85rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .dash-claim-card__head {
          display: flex;
          gap: 0.9rem;
          align-items: flex-start;
        }

        .dash-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 1rem;
          font-size: var(--text-xs);
          color: var(--mocha-600);
          margin-bottom: 1rem;
        }

        .dash-meta span {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .dash-card-footer {
          margin-top: auto;
          padding-top: 0.85rem;
          border-top: 1px solid var(--sand-300);
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }

        .dash-claim-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          justify-content: space-between;
        }

        @media (min-width: 768px) {
          .dash-claim-card {
            flex-direction: row;
            align-items: center;
          }
        }

        .dash-claim-card__main {
          flex: 1;
        }

        .dash-claim-card__action {
          flex-shrink: 0;
        }

        .dash-notif-list {
          list-style: none;
          display: flex;
          flex-direction: column;
        }

        .dash-notif-item {
          display: flex;
          gap: 0.85rem;
          padding: 0.9rem;
          border-bottom: 1px solid var(--sand-300);
          border-radius: var(--radius-sm);
        }

        .dash-notif-item:last-child {
          border-bottom: none;
        }

        .dash-notif-item--unread {
          background-color: var(--sand-200);
        }

        .dash-notif-icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background-color: var(--cream-50);
          border: 1px solid var(--sand-300);
          color: var(--bronze-700);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .dash-notif-action {
          border: none;
          background: transparent;
          color: var(--bronze-700);
          font-size: var(--text-xs);
          font-weight: 600;
          cursor: pointer;
          padding: 0;
        }

        .dash-notif-action:hover {
          text-decoration: underline;
        }

        .dash-ai-metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        @media (min-width: 768px) {
          .dash-ai-metrics-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .dash-ai-metric {
          background-color: var(--cream-50);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
          padding: 0.75rem 0.9rem;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .dash-ai-metric span {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--mocha-600);
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .dash-ai-metric strong {
          font-family: var(--font-Heading);
          font-size: 1.55rem;
          color: var(--mocha-900);
          line-height: 1.1;
        }

        .dash-ai-metric small {
          font-size: 0.7rem;
          color: var(--mocha-600);
        }

        .dash-recent-photos-strip {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.65rem;
        }

        @media (min-width: 768px) {
          .dash-recent-photos-strip {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .dash-photo-pair-pill {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.55rem 0.75rem;
          border-radius: var(--radius-md);
          background-color: var(--cream-50);
          border: 1px solid var(--sand-300);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .dash-photo-pair-pill:hover {
          border-color: var(--bronze-500);
          box-shadow: var(--shadow-xs);
        }

        .dash-photo-pair-thumbs {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          flex-shrink: 0;
        }

        .dash-photo-pair-thumbs .thumb {
          width: 38px;
          height: 38px;
        }

        .dash-photo-pair-connector {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--bronze-700);
        }

        .dash-match-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin-bottom: 1rem;
        }

        .ai-stage-pill {
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-pill);
          font-size: 0.74rem;
          font-weight: 600;
          border: 1px solid var(--sand-300);
          background-color: var(--cream-50);
          color: var(--mocha-600);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ai-stage-pill--active {
          background-color: var(--mocha-900);
          border-color: var(--mocha-900);
          color: var(--cream-50);
        }

        @media (max-width: 479px) {
          .dash-actions > * {
            flex: 1 1 100%;
          }
        }
      `}</style>
    </div>
  );
}
