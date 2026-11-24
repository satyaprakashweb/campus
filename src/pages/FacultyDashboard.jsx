import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  FileCheck2,
  Award,
  PlusCircle,
  Edit3,
  XCircle,
  Eye,
  Bell,
  CheckCheck,
  User,
  Lock,
  Building2,
  QrCode,
  Calendar,
  MapPin,
  Search,
  RefreshCw,
  Upload,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortalData } from '../context/PortalDataContext';
import {
  categories as CATEGORIES,
  locations as CAMPUS_LOCATIONS,
  getCategoryLabel,
} from '../data/mockData';
import { api } from '../data/api';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Input from '../components/Input';
import MatchCard from '../components/MatchCard';
import AnimatedPhotoMatcher from '../components/AnimatedPhotoMatcher';

export default function FacultyDashboard() {
  const { user, updateProfile, changePassword } = useAuth();
  const {
    items = [],
    claims = [],
    notifications = [],
    aiMatches = [],
    addItem,
    updateItem,
    addClaim,
    submitMatchFeedback,
    markNotificationRead,
    markAllNotificationsRead,
    showToast,
  } = usePortalData();

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';

  // Active section derived from route pathname
  const activeTab = useMemo(() => {
    const p = location.pathname;
    if (p.includes('/faculty/report')) return 'report';
    if (p.includes('/faculty/lost-reports')) return 'lost-reports';
    if (p.includes('/faculty/found-reports')) return 'found-reports';
    if (p.includes('/faculty/items')) return 'items';
    if (p.includes('/faculty/ai-matches')) return 'ai-matches';
    if (p.includes('/faculty/claims')) return 'claims';
    if (p.includes('/faculty/notifications')) return 'notifications';
    if (p.includes('/faculty/profile')) return 'profile';
    if (p.includes('/faculty/settings')) return 'settings';
    return 'overview';
  }, [location.pathname]);

  // Verify live backend role-protected faculty dashboard telemetry
  const [facultyApiData, setFacultyApiData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api
      .getFacultyDashboard()
      .then((res) => {
        if (!cancelled) setFacultyApiData(res);
      })
      .catch(() => {
        // Fallback to context items if needed
      });
    return () => {
      cancelled = true;
    };
  }, [items.length, claims.length, notifications.length]);

  // Filtered datasets for this faculty member and their authorized department
  const myItems = useMemo(
    () => items.filter((i) => i.userId === user?.id),
    [items, user?.id]
  );
  const myLostItems = useMemo(() => myItems.filter((i) => i.type === 'lost'), [myItems]);
  const myFoundItems = useMemo(() => myItems.filter((i) => i.type === 'found'), [myItems]);
  const myItemIds = useMemo(() => new Set(myItems.map((i) => i.id)), [myItems]);

  const departmentItems = useMemo(() => {
    const dept = user?.department;
    const uid = user?.id;
    if (!dept) return myItems;
    return items.filter(
      (i) => i.userId === uid || (i.reporter?.department && i.reporter.department === dept)
    );
  }, [items, myItems, user?.id, user?.department]);

  const myMatches = useMemo(() => {
    return aiMatches.filter(
      (m) =>
        m.status !== 'invalidated' &&
        m.status !== 'dismissed' &&
        (myItemIds.has(m.lostItemId) || myItemIds.has(m.foundItemId))
    );
  }, [aiMatches, myItemIds]);

  const myClaims = useMemo(() => {
    return claims.filter(
      (c) =>
        c.claimantId === user?.id ||
        myItemIds.has(c.foundItemId) ||
        myItemIds.has(c.lostItemId)
    );
  }, [claims, user?.id, myItemIds]);

  const myNotifications = useMemo(
    () => notifications.filter((n) => n.userId === user?.id),
    [notifications, user?.id]
  );

  const recoveredCount = useMemo(() => {
    const rec = departmentItems.filter(
      (i) => i.status === 'Resolved' || i.status === 'Returned'
    ).length;
    return rec || facultyApiData?.stats?.recoveredItemsCount || 0;
  }, [departmentItems, facultyApiData]);

  // --- B. Faculty Item Reporting State ---
  const [reportForm, setReportForm] = useState(() => ({
    type: 'found',
    title: '',
    category: 'book',
    description: '',
    location: 'Computer Lab',
    date: new Date().toISOString().slice(0, 10),
    time: '14:00',
    color: '',
    brand: '',
    distinguishingFeatures: '',
    additionalInfo: '',
    photos: [],
  }));
  const [reportError, setReportError] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [newlyReportedItem, setNewlyReportedItem] = useState(null);

  const handleReportPhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.slice(0, 5 - reportForm.photos.length).forEach((file) => {
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast('Only JPG, JPEG, PNG, and WEBP photographs are supported.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Each photograph must be under 5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setReportForm((prev) => ({
          ...prev,
          photos: [...prev.photos, reader.result].slice(0, 5),
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportForm.title.trim() || !reportForm.description.trim()) {
      setReportError('Please provide both the item name and detailed description.');
      return;
    }
    try {
      setIsReporting(true);
      setReportError('');
      const created = await addItem({
        ...reportForm,
        photo: reportForm.photos[0] || '/images/book.jpg',
        photos: reportForm.photos.length > 0 ? reportForm.photos : ['/images/book.jpg'],
      });
      setNewlyReportedItem(created);
      showToast(`Faculty ${reportForm.type.toUpperCase()} report (${created.reportCode}) submitted! Running AI matching...`);
      navigate('/faculty/ai-matches');
    } catch (err) {
      setReportError(err.message || 'Could not submit faculty report.');
    } finally {
      setIsReporting(false);
    }
  };

  // --- Edit / Close Report Modal State ---
  const [editingItem, setEditingItem] = useState(null);
  const [scopeFilter, setScopeFilter] = useState('mine'); // 'mine' | 'department'
  const [searchQuery, setSearchQuery] = useState(urlQuery);

  const handleSaveEditedItem = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await updateItem(editingItem.id, {
        title: editingItem.title,
        category: editingItem.category,
        description: editingItem.description,
        color: editingItem.color,
        brand: editingItem.brand,
        location: editingItem.location,
        distinguishingFeatures: editingItem.distinguishingFeatures,
        status: editingItem.status,
      });
      setEditingItem(null);
    } catch (err) {
      showToast(err.message || 'Failed to update faculty report.');
    }
  };

  const handleCloseOrCancelReport = async (item) => {
    try {
      await updateItem(item.id, { status: 'Closed' });
      showToast(`Report ${item.reportCode || item.id} marked as Closed.`);
    } catch (err) {
      showToast(err.message || 'Could not close report.');
    }
  };

  // --- C. Faculty AI Matches Animation State ---
  const [selectedSourceItemId, setSelectedSourceItemId] = useState('');
  const [showMatchAnimation, setShowMatchAnimation] = useState(true);
  const [animReplayKey, setAnimReplayKey] = useState(0);

  const activeSourceItem = useMemo(() => {
    if (newlyReportedItem) return newlyReportedItem;
    if (selectedSourceItemId) {
      return myItems.find((i) => i.id === selectedSourceItemId) || myItems[0] || null;
    }
    return myLostItems[0] || myFoundItems[0] || null;
  }, [newlyReportedItem, selectedSourceItemId, myItems, myLostItems, myFoundItems]);

  const matchesForActiveSource = useMemo(() => {
    if (!activeSourceItem) return myMatches;
    return myMatches.filter(
      (m) => m.lostItemId === activeSourceItem.id || m.foundItemId === activeSourceItem.id
    );
  }, [activeSourceItem, myMatches]);

  // --- D. Faculty Claim Submission Modal State ---
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimForm, setClaimForm] = useState({
    foundItemId: '',
    lostItemId: '',
    identificationDetails: '',
    uniqueFeatures: '',
    purchaseDate: '',
    supportingInfo: '',
    claimReason: '',
    proofPhoto: '',
  });
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  const availableFoundItemsForClaim = useMemo(
    () => items.filter((i) => i.type === 'found' && i.status !== 'Closed' && i.status !== 'Returned'),
    [items]
  );

  const handleClaimProofUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setClaimForm((prev) => ({ ...prev, proofPhoto: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleFacultyClaimSubmit = async (e) => {
    e.preventDefault();
    if (!claimForm.foundItemId || !claimForm.identificationDetails.trim()) {
      showToast('Please select a found item and provide ownership identification details.');
      return;
    }
    try {
      setIsSubmittingClaim(true);
      await addClaim({
        itemId: claimForm.foundItemId,
        foundItemId: claimForm.foundItemId,
        lostItemId: claimForm.lostItemId || null,
        identifyingDetails: claimForm.identificationDetails,
        uniqueFeatures: claimForm.uniqueFeatures,
        purchaseDate: claimForm.purchaseDate,
        supportingInfo: claimForm.supportingInfo,
        claimReason: claimForm.claimReason || 'Faculty ownership claim submission',
        proofPhoto: claimForm.proofPhoto || null,
        contact: user?.email,
      });
      setClaimModalOpen(false);
      setClaimForm({
        foundItemId: '',
        lostItemId: '',
        identificationDetails: '',
        uniqueFeatures: '',
        purchaseDate: '',
        supportingInfo: '',
        claimReason: '',
        proofPhoto: '',
      });
    } catch (err) {
      showToast(err.message || 'Could not submit ownership claim.');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  // --- F. Faculty Profile & Settings State ---
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    department: user?.department || 'Computer Science & Engineering',
    course: user?.course || 'Associate Professor / Faculty',
    semester: user?.semester || 'Faculty',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
    inApp: user?.notificationPrefs?.inApp ?? true,
    emailAlerts: user?.notificationPrefs?.emailAlerts ?? true,
    matchThreshold: user?.notificationPrefs?.matchThreshold ?? 0.45,
  });
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwMessage, setPwMessage] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await updateProfile({
        name: profileForm.name,
        department: profileForm.department,
        course: profileForm.course,
        semester: profileForm.semester,
        phone: profileForm.phone,
        avatar: profileForm.avatar || null,
        notificationPrefs: {
          inApp: profileForm.inApp,
          emailAlerts: profileForm.emailAlerts,
          matchThreshold: Number(profileForm.matchThreshold),
        },
      });
      showToast('Faculty profile and preferences updated.');
    } catch (err) {
      showToast(err.message || 'Could not update faculty profile.');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 8) {
      setPwMessage('New password must be at least 8 characters.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMessage('New password and confirmation do not match.');
      return;
    }
    try {
      await changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwMessage('');
      showToast('Faculty password changed successfully.');
    } catch (err) {
      setPwMessage(err.message || 'Failed to change password.');
    }
  };

  // Filtered items for My Reports / Lost Reports / Found Reports views
  const displayedReports = useMemo(() => {
    const base = scopeFilter === 'department' ? departmentItems : myItems;
    return base.filter((item) => {
      if (activeTab === 'lost-reports' && item.type !== 'lost') return false;
      if (activeTab === 'found-reports' && item.type !== 'found') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${item.title} ${item.reportCode || ''} ${item.location} ${item.category} ${item.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scopeFilter, departmentItems, myItems, activeTab, searchQuery]);

  return (
    <div className="fac-dash">
      {/* =====================================================================
          A. FACULTY DASHBOARD OVERVIEW (/faculty or /faculty/dashboard)
          ===================================================================== */}
      {activeTab === 'overview' && (
        <>
          <div className="fac-welcome-banner">
            <div>
              <span className="fac-welcome-tag">
                <Building2 size={14} /> {user?.department || 'Computer Science & Engineering'} ·{' '}
                {user?.identifier || 'FAC-204'}
              </span>
              <h2>Welcome back, {user?.name || 'Dr. Priyabrata Mohanty'}</h2>
              <p>
                Monitor your reported lost &amp; found items, review multimodal AI matches
                (Sentence-BERT + TF-IDF + CLIP ViT-B/32), and track departmental item recovery.
              </p>
            </div>
            <div className="fac-welcome-actions">
              <Button variant="primary" onClick={() => navigate('/faculty/report')}>
                <PlusCircle size={16} /> Report Lost / Found Item
              </Button>
              <Button variant="secondary" onClick={() => navigate('/faculty/ai-matches')}>
                <Sparkles size={16} /> View AI Matches ({myMatches.length})
              </Button>
            </div>
          </div>

          {/* 6 Live Database Statistics Cards */}
          <div className="fac-stats-grid" role="region" aria-label="Faculty Portal Statistics">
            <Card className="fac-stat-card" onClick={() => navigate('/faculty/items')}>
              <div className="fac-stat-icon fac-stat-icon--brown">
                <Package size={20} />
              </div>
              <div>
                <span className="fac-stat-label">Total Items Reported by Faculty</span>
                <strong className="fac-stat-value">{myItems.length}</strong>
                <span className="fac-stat-sub">
                  {departmentItems.length} total in {user?.department || 'Department'}
                </span>
              </div>
            </Card>

            <Card className="fac-stat-card" onClick={() => navigate('/faculty/lost-reports')}>
              <div className="fac-stat-icon fac-stat-icon--terra">
                <AlertCircle size={20} />
              </div>
              <div>
                <span className="fac-stat-label">Lost Items</span>
                <strong className="fac-stat-value">{myLostItems.length}</strong>
                <span className="fac-stat-sub">Reported by you</span>
              </div>
            </Card>

            <Card className="fac-stat-card" onClick={() => navigate('/faculty/found-reports')}>
              <div className="fac-stat-icon fac-stat-icon--sage">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span className="fac-stat-label">Found Items</span>
                <strong className="fac-stat-value">{myFoundItems.length}</strong>
                <span className="fac-stat-sub">Safeguarded / logged</span>
              </div>
            </Card>

            <Card className="fac-stat-card" onClick={() => navigate('/faculty/ai-matches')}>
              <div className="fac-stat-icon fac-stat-icon--amber">
                <Sparkles size={20} />
              </div>
              <div>
                <span className="fac-stat-label">Active AI Matches</span>
                <strong className="fac-stat-value">{myMatches.length}</strong>
                <span className="fac-stat-sub">SBERT + TF-IDF + CLIP ViT-B/32</span>
              </div>
            </Card>

            <Card className="fac-stat-card" onClick={() => navigate('/faculty/claims')}>
              <div className="fac-stat-icon fac-stat-icon--tan">
                <FileCheck2 size={20} />
              </div>
              <div>
                <span className="fac-stat-label">Pending Claims</span>
                <strong className="fac-stat-value">
                  {myClaims.filter((c) => c.status === 'Pending').length}
                </strong>
                <span className="fac-stat-sub">{myClaims.length} total associated claims</span>
              </div>
            </Card>

            <Card className="fac-stat-card" onClick={() => navigate('/faculty/items')}>
              <div className="fac-stat-icon fac-stat-icon--sage">
                <Award size={20} />
              </div>
              <div>
                <span className="fac-stat-label">Successfully Recovered Items</span>
                <strong className="fac-stat-value">{recoveredCount}</strong>
                <span className="fac-stat-sub">Verified &amp; handed over</span>
              </div>
            </Card>
          </div>

          {/* Two-Column Overview Grid: Recent Faculty Reports + Important Notifications */}
          <div className="fac-overview-grid">
            <Card className="fac-panel">
              <div className="fac-panel__head">
                <div>
                  <h3>Recent Faculty Reports</h3>
                  <p>Your latest lost and found submissions connected to the AI matching engine</p>
                </div>
                <Link to="/faculty/items" className="fac-text-link">
                  View All Reports <ArrowRight size={14} />
                </Link>
              </div>

              <div className="fac-report-list">
                {myItems.slice(0, 4).map((item) => (
                  <div key={item.id} className="fac-report-row">
                    <img
                      src={item.photo || '/images/book.jpg'}
                      alt={item.title}
                      className="fac-report-row__thumb"
                    />
                    <div className="fac-report-row__info">
                      <div className="fac-report-row__top">
                        <Badge variant={item.type}>{item.type.toUpperCase()}</Badge>
                        <span className="fac-code">{item.reportCode || item.id}</span>
                        <Badge variant="neutral">{item.status}</Badge>
                      </div>
                      <h4>{item.title}</h4>
                      <p>
                        <MapPin size={12} /> {item.location} · <Calendar size={12} /> {item.date}
                      </p>
                    </div>
                    <div className="fac-report-row__actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedSourceItemId(item.id);
                          navigate('/faculty/ai-matches');
                        }}
                      >
                        <Sparkles size={14} /> AI Matches
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/items/${item.id}`)}
                      >
                        <Eye size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="fac-panel">
              <div className="fac-panel__head">
                <div>
                  <h3>Important Faculty Notifications</h3>
                  <p>Real-time AI match discoveries, claim updates, and campus alerts</p>
                </div>
                <Link to="/faculty/notifications" className="fac-text-link">
                  All Alerts <ArrowRight size={14} />
                </Link>
              </div>

              <div className="fac-notif-list">
                {myNotifications.length === 0 ? (
                  <p className="fac-empty-text">No faculty notifications yet.</p>
                ) : (
                  myNotifications.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      className={`fac-notif-item ${!n.isRead ? 'fac-notif-item--unread' : ''}`}
                    >
                      <div className="fac-notif-item__icon">
                        <Bell size={16} />
                      </div>
                      <div className="fac-notif-item__body">
                        <strong>{n.title}</strong>
                        <p>{n.message}</p>
                        <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                      {!n.isRead && (
                        <button
                          type="button"
                          className="fac-mark-read"
                          onClick={() => markNotificationRead(n.id)}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Active AI Matches Preview on Overview */}
          {myMatches.length > 0 && (
            <Card className="fac-panel" style={{ marginTop: '1.5rem' }}>
              <div className="fac-panel__head">
                <div>
                  <h3>Top Multimodal AI Matches for Your Reports</h3>
                  <p>
                    Ranked by Sentence-BERT (35%) + TF-IDF (15%) + CLIP Image Similarity (30%) +
                    Context (20%)
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/faculty/ai-matches')}
                >
                  Open Full AI Match Studio
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {myMatches.slice(0, 2).map((match, idx) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    sourceItem={match.lostItem}
                    rank={idx + 1}
                    index={idx}
                    onFeedback={(mId, status) => submitMatchFeedback(mId, { status })}
                  />
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* =====================================================================
          B. FACULTY ITEM REPORTING (/faculty/report)
          ===================================================================== */}
      {activeTab === 'report' && (
        <Card className="fac-panel">
          <div className="fac-panel__head">
            <div>
              <h2>Report a Lost or Found Item (Faculty Portal)</h2>
              <p>
                Upload multiple photographs and structured details. CampusFind will immediately
                extract 512-d CLIP embeddings and run Sentence-BERT + TF-IDF matching.
              </p>
            </div>
          </div>

          {reportError && (
            <div className="alert alert--danger" role="alert" style={{ marginBottom: '1rem' }}>
              {reportError}
            </div>
          )}

          <form onSubmit={handleReportSubmit} className="fac-form-grid">
            <div className="fac-type-toggle">
              <button
                type="button"
                className={`fac-type-btn ${reportForm.type === 'lost' ? 'fac-type-btn--active-lost' : ''}`}
                onClick={() => setReportForm((prev) => ({ ...prev, type: 'lost' }))}
              >
                <AlertCircle size={18} /> I Lost an Item
              </button>
              <button
                type="button"
                className={`fac-type-btn ${reportForm.type === 'found' ? 'fac-type-btn--active-found' : ''}`}
                onClick={() => setReportForm((prev) => ({ ...prev, type: 'found' }))}
              >
                <CheckCircle2 size={18} /> I Found an Item (Lab / Cabin / Campus)
              </button>
            </div>

            <div className="fac-form-two-col">
              <Input
                id="fac-item-title"
                label="Item Name / Title"
                required
                placeholder="e.g. Casio FX-991EX Calculator or Lab Workstation Key Ring"
                value={reportForm.title}
                onChange={(e) => setReportForm((prev) => ({ ...prev, title: e.target.value }))}
              />

              <div className="form-group">
                <label htmlFor="fac-item-category" className="form-label form-label--required">
                  Item Category
                </label>
                <select
                  id="fac-item-category"
                  className="form-input"
                  value={reportForm.category}
                  onChange={(e) => setReportForm((prev) => ({ ...prev, category: e.target.value }))}
                >
                  {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="fac-item-desc" className="form-label form-label--required">
                Detailed Description
              </label>
              <textarea
                id="fac-item-desc"
                rows={3}
                className="form-input"
                placeholder="Describe physical appearance, academic markings, where it was found or lost..."
                value={reportForm.description}
                onChange={(e) =>
                  setReportForm((prev) => ({ ...prev, description: e.target.value }))
                }
                required
              />
            </div>

            <div className="fac-form-three-col">
              <div className="form-group">
                <label htmlFor="fac-item-location" className="form-label form-label--required">
                  Campus Location
                </label>
                <select
                  id="fac-item-location"
                  className="form-input"
                  value={reportForm.location}
                  onChange={(e) => setReportForm((prev) => ({ ...prev, location: e.target.value }))}
                >
                  {CAMPUS_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                id="fac-item-date"
                label="Date"
                type="date"
                required
                value={reportForm.date}
                onChange={(e) => setReportForm((prev) => ({ ...prev, date: e.target.value }))}
              />

              <Input
                id="fac-item-time"
                label="Approximate Time"
                type="time"
                value={reportForm.time}
                onChange={(e) => setReportForm((prev) => ({ ...prev, time: e.target.value }))}
              />
            </div>

            <div className="fac-form-three-col">
              <Input
                id="fac-item-color"
                label="Primary Color"
                placeholder="e.g. Black / Silver / Blue"
                value={reportForm.color}
                onChange={(e) => setReportForm((prev) => ({ ...prev, color: e.target.value }))}
              />

              <Input
                id="fac-item-brand"
                label="Brand / Publisher"
                placeholder="e.g. Samsung, MIT Press, Casio"
                value={reportForm.brand}
                onChange={(e) => setReportForm((prev) => ({ ...prev, brand: e.target.value }))}
              />

              <Input
                id="fac-item-features"
                label="Identifying Features"
                placeholder="e.g. Sticker on back, tab on Ch. 6"
                value={reportForm.distinguishingFeatures}
                onChange={(e) =>
                  setReportForm((prev) => ({ ...prev, distinguishingFeatures: e.target.value }))
                }
              />
            </div>

            {/* Multiple Item Photographs Upload */}
            <div className="fac-photo-upload-box">
              <div className="fac-photo-upload-head">
                <div>
                  <strong>Upload Item Photographs (Up to 5 Photos for CLIP ViT-B/32 Analysis)</strong>
                  <p>Supports JPG, JPEG, PNG, and WEBP up to 5 MB each</p>
                </div>
                <label className="fac-upload-trigger">
                  <Upload size={16} /> Select Photographs
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handleReportPhotoUpload}
                    hidden
                  />
                </label>
              </div>

              {reportForm.photos.length > 0 && (
                <div className="fac-photo-preview-grid">
                  {reportForm.photos.map((src, idx) => (
                    <div key={idx} className="fac-photo-preview-card">
                      <img src={src} alt={`Upload preview ${idx + 1}`} />
                      <button
                        type="button"
                        onClick={() =>
                          setReportForm((prev) => ({
                            ...prev,
                            photos: prev.photos.filter((_, i) => i !== idx),
                          }))
                        }
                        aria-label="Remove photograph"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button type="button" variant="secondary" onClick={() => navigate('/faculty/items')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isReporting}>
                {isReporting ? 'Submitting & Running AI Match...' : 'Submit Report & Run AI Matching'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* =====================================================================
          MY REPORTS / LOST REPORTS / FOUND REPORTS
          (/faculty/items, /faculty/lost-reports, /faculty/found-reports)
          ===================================================================== */}
      {(activeTab === 'items' || activeTab === 'lost-reports' || activeTab === 'found-reports') && (
        <Card className="fac-panel">
          <div className="fac-panel__head">
            <div>
              <h2>
                {activeTab === 'lost-reports'
                  ? 'Faculty Lost Item Reports'
                  : activeTab === 'found-reports'
                  ? 'Faculty Found Item Reports'
                  : 'All Faculty Lost & Found Reports'}
              </h2>
              <p>
                Edit your submitted reports, view current verification status, trigger AI match
                discovery, or close resolved reports.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <Button variant="primary" size="sm" onClick={() => navigate('/faculty/report')}>
                <PlusCircle size={15} /> Report New Item
              </Button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="fac-filter-bar">
            <div className="fac-filter-pills">
              <button
                type="button"
                className={`fac-pill ${activeTab === 'items' ? 'fac-pill--active' : ''}`}
                onClick={() => navigate('/faculty/items')}
              >
                All ({myItems.length})
              </button>
              <button
                type="button"
                className={`fac-pill ${activeTab === 'lost-reports' ? 'fac-pill--active' : ''}`}
                onClick={() => navigate('/faculty/lost-reports')}
              >
                Lost Reports ({myLostItems.length})
              </button>
              <button
                type="button"
                className={`fac-pill ${activeTab === 'found-reports' ? 'fac-pill--active' : ''}`}
                onClick={() => navigate('/faculty/found-reports')}
              >
                Found Reports ({myFoundItems.length})
              </button>
              <button
                type="button"
                className={`fac-pill ${scopeFilter === 'department' ? 'fac-pill--active' : ''}`}
                onClick={() =>
                  setScopeFilter((prev) => (prev === 'mine' ? 'department' : 'mine'))
                }
              >
                {scopeFilter === 'department'
                  ? `Showing ${user?.department || 'Dept.'} (${departmentItems.length})`
                  : `Include ${user?.department || 'Department'} Reports`}
              </button>
            </div>

            <div className="fac-filter-search">
              <Search size={15} />
              <input
                type="search"
                placeholder="Filter by title, code, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="fac-items-table-wrap">
            {displayedReports.length === 0 ? (
              <div className="fac-empty-box">
                <p>No reports match the current filter.</p>
                <Button variant="primary" size="sm" onClick={() => navigate('/faculty/report')}>
                  Report an Item
                </Button>
              </div>
            ) : (
              <div className="fac-report-list">
                {displayedReports.map((item) => {
                  const isOwner = item.userId === user?.id;
                  return (
                    <div key={item.id} className="fac-report-row">
                      <img
                        src={item.photo || '/images/book.jpg'}
                        alt={item.title}
                        className="fac-report-row__thumb"
                      />
                      <div className="fac-report-row__info">
                        <div className="fac-report-row__top">
                          <Badge variant={item.type}>{item.type.toUpperCase()}</Badge>
                          <span className="fac-code">{item.reportCode || item.id}</span>
                          <Badge variant="neutral">{getCategoryLabel(item.category)}</Badge>
                          <Badge
                            variant={
                              item.status === 'Resolved' || item.status === 'Returned'
                                ? 'found'
                                : 'neutral'
                            }
                          >
                            Status: {item.status}
                          </Badge>
                        </div>
                        <h4>{item.title}</h4>
                        <p>{item.description}</p>
                        <div className="fac-report-row__meta">
                          <span>
                            <MapPin size={13} /> {item.location}
                          </span>
                          <span>
                            <Calendar size={13} /> {item.date} {item.time}
                          </span>
                          {item.color && <span>Color: {item.color}</span>}
                          {item.brand && <span>Brand: {item.brand}</span>}
                        </div>
                      </div>

                      <div className="fac-report-row__actions">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedSourceItemId(item.id);
                            navigate('/faculty/ai-matches');
                          }}
                        >
                          <Sparkles size={14} /> AI Matches
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/items/${item.id}`)}
                        >
                          <Eye size={14} /> Details
                        </Button>

                        {isOwner && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingItem({ ...item })}
                            >
                              <Edit3 size={14} /> Edit
                            </Button>
                            {item.status !== 'Closed' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCloseOrCancelReport(item)}
                              >
                                <XCircle size={14} /> Close
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Edit Submitted Report Modal */}
      {editingItem && (
        <div className="fac-modal-backdrop" role="dialog" aria-modal="true">
          <Card className="fac-modal-card">
            <h3>Edit Faculty Report ({editingItem.reportCode || editingItem.id})</h3>
            <form onSubmit={handleSaveEditedItem} className="fac-form-grid">
              <Input
                id="edit-fac-title"
                label="Item Title"
                required
                value={editingItem.title}
                onChange={(e) => setEditingItem((prev) => ({ ...prev, title: e.target.value }))}
              />
              <div className="form-group">
                <label htmlFor="edit-fac-desc" className="form-label">
                  Description
                </label>
                <textarea
                  id="edit-fac-desc"
                  rows={3}
                  className="form-input"
                  value={editingItem.description}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
              <div className="fac-form-two-col">
                <div className="form-group">
                  <label htmlFor="edit-fac-loc" className="form-label">
                    Location
                  </label>
                  <select
                    id="edit-fac-loc"
                    className="form-input"
                    value={editingItem.location}
                    onChange={(e) =>
                      setEditingItem((prev) => ({ ...prev, location: e.target.value }))
                    }
                  >
                    {CAMPUS_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  id="edit-fac-color"
                  label="Color"
                  value={editingItem.color || ''}
                  onChange={(e) => setEditingItem((prev) => ({ ...prev, color: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* =====================================================================
          C. FACULTY AI MATCHES (/faculty/ai-matches)
          ===================================================================== */}
      {activeTab === 'ai-matches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card className="fac-panel">
            <div className="fac-panel__head">
              <div>
                <h2>Faculty Multimodal AI Match Discovery</h2>
                <p>
                  Compare your reported Lost &amp; Found items using Sentence-BERT semantic text
                  vectors, TF-IDF lexical weights, and 512-d CLIP ViT-B/32 visual embeddings.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  className="form-input"
                  style={{ width: 'auto', minWidth: '240px', padding: '0.45rem 0.75rem' }}
                  value={activeSourceItem?.id || ''}
                  onChange={(e) => {
                    setNewlyReportedItem(null);
                    setSelectedSourceItemId(e.target.value);
                    setShowMatchAnimation(true);
                    setAnimReplayKey((k) => k + 1);
                  }}
                  aria-label="Select faculty report for AI matching"
                >
                  {myItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      [{it.type.toUpperCase()}] {it.reportCode || it.id} — {it.title}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setShowMatchAnimation(true);
                    setAnimReplayKey((k) => k + 1);
                  }}
                >
                  <RefreshCw size={14} /> Replay AI Scan Animation
                </Button>
              </div>
            </div>

            {/* 5-Stage Animated AI Matching Experience */}
            {showMatchAnimation && (matchesForActiveSource[0] || myMatches[0]) && (
              <div style={{ marginTop: '0.75rem' }}>
                <AnimatedPhotoMatcher
                  key={`${activeSourceItem?.id || 'fac'}-${animReplayKey}`}
                  match={matchesForActiveSource[0] || myMatches[0]}
                  allMatches={matchesForActiveSource.length > 0 ? matchesForActiveSource : myMatches}
                  candidateItems={items}
                  autoPlay={true}
                />
              </div>
            )}
          </Card>

          <Card className="fac-panel">
            <div className="fac-panel__head">
              <div>
                <h3>Ranked Multimodal Potential Matches ({myMatches.length})</h3>
                <p>
                  Showing side-by-side Lost &amp; Found item photographs, Sentence-BERT, TF-IDF,
                  CLIP Image similarity, compatibility badges, and explanations
                </p>
              </div>
            </div>

            {myMatches.length === 0 ? (
              <div className="fac-empty-box">
                <p>No active AI matches above threshold for your current reports.</p>
                <Button variant="primary" size="sm" onClick={() => navigate('/faculty/report')}>
                  Report an Item to Trigger AI Matching
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {myMatches.map((match, idx) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    sourceItem={match.lostItem}
                    rank={idx + 1}
                    index={idx}
                    onFeedback={(mId, status) => submitMatchFeedback(mId, { status })}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          D. FACULTY CLAIM MANAGEMENT (/faculty/claims)
          ===================================================================== */}
      {activeTab === 'claims' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
          <Card className="fac-panel">
            <div className="fac-panel__head">
              <div>
                <h2>Faculty Ownership Claims &amp; Handover Tracking</h2>
                <p>
                  Submit an ownership claim, upload supporting evidence, track verification status,
                  and view scheduled handover QR tokens.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setClaimModalOpen(true)}>
                <PlusCircle size={15} /> Submit Ownership Claim
              </Button>
            </div>

            <div className="fac-governance-banner">
              <ShieldAlert size={18} />
              <span>
                <strong>Role Separation Policy:</strong> Faculty members can submit ownership claims
                and review claims filed on items they found, but final claim approval or rejection
                is strictly reserved for the Campus Administrator.
              </span>
            </div>

            {myClaims.length === 0 ? (
              <div className="fac-empty-box">
                <p>No ownership claims associated with your faculty account yet.</p>
                <Button variant="secondary" size="sm" onClick={() => setClaimModalOpen(true)}>
                  Submit an Ownership Claim
                </Button>
              </div>
            ) : (
              <div className="fac-claims-list">
                {myClaims.map((claim) => {
                  const foundItem = items.find((i) => i.id === claim.foundItemId);
                  const isMySubmission = claim.claimantId === user?.id;
                  return (
                    <div key={claim.id} className="fac-claim-card">
                      <div className="fac-claim-card__top">
                        <div>
                          <span className="fac-code">{claim.claimCode || claim.id}</span>
                          <Badge
                            variant={
                              claim.status === 'Approved'
                                ? 'found'
                                : claim.status === 'Rejected'
                                ? 'lost'
                                : 'neutral'
                            }
                          >
                            Verification Status: {claim.status}
                          </Badge>
                          <Badge variant="neutral">
                            {isMySubmission ? 'Submitted by You' : 'Claim on Your Found Report'}
                          </Badge>
                        </div>
                        <Link to={`/claims/${claim.id}`} className="fac-text-link">
                          Open Claim Dossier <ArrowRight size={14} />
                        </Link>
                      </div>

                      <h4>{foundItem?.title || `Found Item (${claim.foundItemId})`}</h4>
                      <p className="fac-claim-card__details">
                        <strong>Claimant:</strong> {claim.claimantName} ·{' '}
                        <strong>Identification Proof:</strong> {claim.identificationDetails}
                      </p>
                      {claim.uniqueFeatures && (
                        <p className="fac-claim-card__details">
                          <strong>Unique Features:</strong> {claim.uniqueFeatures}
                        </p>
                      )}

                      {claim.handover && (
                        <div className="fac-handover-strip">
                          <div>
                            <strong>
                              <QrCode size={15} /> Handover Status: {claim.handover.status}
                            </strong>
                            <span>
                              Location: {claim.handover.location} · Scheduled:{' '}
                              {claim.handover.scheduledDate} at {claim.handover.time}
                            </span>
                          </div>
                          <span className="fac-qr-pill">
                            QR Token: {claim.handover.qrToken}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Submit Claim Modal */}
          {claimModalOpen && (
            <div className="fac-modal-backdrop" role="dialog" aria-modal="true">
              <Card className="fac-modal-card">
                <h3>Submit Faculty Ownership Claim</h3>
                <form onSubmit={handleFacultyClaimSubmit} className="fac-form-grid">
                  <div className="form-group">
                    <label htmlFor="fac-claim-found" className="form-label form-label--required">
                      Select Found Item to Claim
                    </label>
                    <select
                      id="fac-claim-found"
                      className="form-input"
                      required
                      value={claimForm.foundItemId}
                      onChange={(e) =>
                        setClaimForm((prev) => ({ ...prev, foundItemId: e.target.value }))
                      }
                    >
                      <option value="">-- Choose a Found Item --</option>
                      {availableFoundItemsForClaim.map((fi) => (
                        <option key={fi.id} value={fi.id}>
                          {fi.reportCode || fi.id} — {fi.title} ({fi.location})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="fac-claim-id-details" className="form-label form-label--required">
                      Ownership Identification Details
                    </label>
                    <textarea
                      id="fac-claim-id-details"
                      rows={3}
                      className="form-input"
                      required
                      placeholder="Describe serial number, cabin key tag number, inscriptions, or contents..."
                      value={claimForm.identificationDetails}
                      onChange={(e) =>
                        setClaimForm((prev) => ({
                          ...prev,
                          identificationDetails: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="fac-form-two-col">
                    <Input
                      id="fac-claim-unique"
                      label="Unique Distinguishing Marks"
                      placeholder="e.g. Brass tag engraved CSE-204"
                      value={claimForm.uniqueFeatures}
                      onChange={(e) =>
                        setClaimForm((prev) => ({ ...prev, uniqueFeatures: e.target.value }))
                      }
                    />
                    <Input
                      id="fac-claim-date"
                      label="Approximate Purchase / Issue Date"
                      type="date"
                      value={claimForm.purchaseDate}
                      onChange={(e) =>
                        setClaimForm((prev) => ({ ...prev, purchaseDate: e.target.value }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Supporting Evidence Photograph (Optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-input"
                      onChange={handleClaimProofUpload}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setClaimModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={isSubmittingClaim}>
                      {isSubmittingClaim ? 'Submitting Claim...' : 'Submit Claim for Admin Review'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          E. FACULTY NOTIFICATIONS (/faculty/notifications)
          ===================================================================== */}
      {activeTab === 'notifications' && (
        <Card className="fac-panel">
          <div className="fac-panel__head">
            <div>
              <h2>Faculty Notifications &amp; Alerts</h2>
              <p>
                New potential AI matches, ownership claim status updates, item status changes, and
                administrative announcements.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => markAllNotificationsRead()}>
              <CheckCheck size={15} /> Mark All as Read
            </Button>
          </div>

          <div className="fac-notif-list">
            {myNotifications.length === 0 ? (
              <p className="fac-empty-text">You have no notifications at this time.</p>
            ) : (
              myNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`fac-notif-item ${!n.isRead ? 'fac-notif-item--unread' : ''}`}
                >
                  <div className="fac-notif-item__icon">
                    <Bell size={16} />
                  </div>
                  <div className="fac-notif-item__body">
                    <strong>{n.title}</strong>
                    <p>{n.message}</p>
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {!n.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markNotificationRead(n.id)}
                      >
                        Mark Read
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* =====================================================================
          F. FACULTY PROFILE & SETTINGS (/faculty/profile & /faculty/settings)
          ===================================================================== */}
      {(activeTab === 'profile' || activeTab === 'settings') && (
        <div className="fac-overview-grid">
          <Card className="fac-panel">
            <div className="fac-panel__head">
              <div>
                <h2>
                  <User size={18} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
                  Faculty Profile &amp; Academic Credentials
                </h2>
                <p>Manage your official university faculty profile and contact details</p>
              </div>
            </div>

            <div className="fac-profile-summary">
              <div className="fac-profile-avatar-lg">
                {profileForm.avatar ? (
                  <img src={profileForm.avatar} alt={user?.name} />
                ) : (
                  <span>{(user?.name || 'F').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h3>{user?.name || 'Dr. Priyabrata Mohanty'}</h3>
                <p>
                  <strong>Faculty ID:</strong> {user?.identifier || 'FAC-204'} ·{' '}
                  <strong>Official Email:</strong> {user?.email}
                </p>
                <p>
                  <strong>Department:</strong> {user?.department} ·{' '}
                  <strong>Designation:</strong> {user?.course || 'Associate Professor'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="fac-form-grid">
              <div className="fac-form-two-col">
                <Input
                  id="fac-prof-name"
                  label="Faculty Full Name"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  id="fac-prof-id"
                  label="Faculty ID (Institutional)"
                  value={user?.identifier || 'FAC-204'}
                  disabled
                />
              </div>

              <div className="fac-form-two-col">
                <Input
                  id="fac-prof-email"
                  label="Official University Email"
                  value={user?.email || 'faculty@university.edu'}
                  disabled
                />
                <Input
                  id="fac-prof-dept"
                  label="Department"
                  value={profileForm.department}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, department: e.target.value }))
                  }
                />
              </div>

              <div className="fac-form-two-col">
                <Input
                  id="fac-prof-desig"
                  label="Designation / Academic Role"
                  value={profileForm.course}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, course: e.target.value }))}
                />
                <Input
                  id="fac-prof-phone"
                  label="Campus Extension / Phone Number"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <Input
                id="fac-prof-avatar"
                label="Profile Photograph URL (Optional)"
                placeholder="https://... or /images/..."
                value={profileForm.avatar}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, avatar: e.target.value }))}
              />

              <Button type="submit" variant="primary">
                Save Faculty Profile
              </Button>
            </form>
          </Card>

          <Card className="fac-panel">
            <div className="fac-panel__head">
              <div>
                <h2>
                  <Lock size={18} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
                  Notification Preferences &amp; Security
                </h2>
                <p>Configure AI match alert thresholds and update your faculty password</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="fac-form-grid">
              <label className="fac-check-row">
                <input
                  type="checkbox"
                  checked={profileForm.inApp}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, inApp: e.target.checked }))
                  }
                />
                <span>Receive real-time in-app multimodal AI match alerts</span>
              </label>

              <label className="fac-check-row">
                <input
                  type="checkbox"
                  checked={profileForm.emailAlerts}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, emailAlerts: e.target.checked }))
                  }
                />
                <span>Receive departmental claim &amp; recovery summaries via official email</span>
              </label>

              <div className="form-group">
                <label htmlFor="fac-threshold" className="form-label">
                  Minimum AI Match Alert Threshold ({Math.round(profileForm.matchThreshold * 100)}%)
                </label>
                <input
                  id="fac-threshold"
                  type="range"
                  min="0.25"
                  max="0.85"
                  step="0.05"
                  value={profileForm.matchThreshold}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, matchThreshold: Number(e.target.value) }))
                  }
                  style={{ accentColor: '#A67C52', width: '100%' }}
                />
              </div>

              <Button type="submit" variant="secondary" size="sm">
                Save Notification Preferences
              </Button>
            </form>

            <hr className="divider" style={{ margin: '1.5rem 0' }} />

            <h3>Change Faculty Password</h3>
            {pwMessage && (
              <div className="alert alert--danger" role="alert" style={{ marginBottom: '0.85rem' }}>
                {pwMessage}
              </div>
            )}
            <form onSubmit={handlePasswordChange} className="fac-form-grid">
              <Input
                id="fac-cur-pw"
                label="Current Password"
                type="password"
                required
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              />
              <Input
                id="fac-new-pw"
                label="New Password (min 8 chars)"
                type="password"
                required
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              />
              <Input
                id="fac-conf-pw"
                label="Confirm New Password"
                type="password"
                required
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              />
              <Button type="submit" variant="primary">
                Update Password
              </Button>
            </form>
          </Card>
        </div>
      )}

      <style>{`
        .fac-dash {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .fac-welcome-banner {
          background: linear-gradient(135deg, #FFFDF8 0%, #EDE4D8 100%);
          border: 1px solid #E3D8C9;
          border-radius: 16px;
          padding: clamp(1.25rem, 2.5vw, 1.85rem);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.25rem;
          flex-wrap: wrap;
          box-shadow: var(--shadow-sm);
        }
        .fac-welcome-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #896642;
          background-color: #F5F0E8;
          border: 1px solid #E3D8C9;
          padding: 0.25rem 0.7rem;
          border-radius: 999px;
          margin-bottom: 0.55rem;
        }
        .fac-welcome-banner h2 {
          font-size: clamp(1.35rem, 2.4vw, 1.75rem);
          color: #3D3228;
          margin-bottom: 0.35rem;
        }
        .fac-welcome-banner p {
          color: #82776B;
          font-size: 0.9rem;
          margin: 0;
          max-width: 660px;
        }
        .fac-welcome-actions {
          display: flex;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .fac-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }
        .fac-stat-card {
          padding: 1.15rem 1.25rem;
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          border-radius: 14px;
          display: flex;
          align-items: flex-start;
          gap: 0.95rem;
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
        }
        .fac-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .fac-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .fac-stat-icon--brown {
          background-color: rgba(166, 124, 82, 0.16);
          color: #896642;
        }
        .fac-stat-icon--terra {
          background-color: rgba(185, 107, 96, 0.16);
          color: #B96B60;
        }
        .fac-stat-icon--sage {
          background-color: rgba(111, 139, 112, 0.18);
          color: #6F8B70;
        }
        .fac-stat-icon--amber {
          background-color: rgba(196, 154, 82, 0.18);
          color: #C49A52;
        }
        .fac-stat-icon--tan {
          background-color: rgba(196, 164, 132, 0.22);
          color: #896642;
        }
        .fac-stat-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #82776B;
          margin-bottom: 0.2rem;
        }
        .fac-stat-value {
          display: block;
          font-family: var(--font-serif);
          font-size: 1.65rem;
          color: #3D3228;
          line-height: 1.1;
        }
        .fac-stat-sub {
          display: block;
          font-size: 0.72rem;
          color: #82776B;
          margin-top: 0.25rem;
        }

        .fac-overview-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.35rem;
        }

        .fac-panel {
          padding: clamp(1.15rem, 2.2vw, 1.6rem);
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          border-radius: 16px;
        }
        .fac-panel__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.15rem;
        }
        .fac-panel__head h2,
        .fac-panel__head h3 {
          margin: 0 0 0.25rem;
          color: #3D3228;
        }
        .fac-panel__head p {
          margin: 0;
          font-size: 0.84rem;
          color: #82776B;
        }

        .fac-text-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: #A67C52;
        }
        .fac-text-link:hover {
          color: #896642;
        }

        .fac-report-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .fac-report-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.85rem;
          border-radius: 12px;
          border: 1px solid #E3D8C9;
          background-color: #F5F0E8;
          flex-wrap: wrap;
        }
        .fac-report-row__thumb {
          width: 68px;
          height: 68px;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid #E3D8C9;
          flex-shrink: 0;
        }
        .fac-report-row__info {
          flex: 1;
          min-width: 200px;
        }
        .fac-report-row__top {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
          margin-bottom: 0.25rem;
        }
        .fac-code {
          font-family: monospace;
          font-size: 0.74rem;
          font-weight: 700;
          color: #896642;
          background-color: #EDE4D8;
          padding: 0.12rem 0.45rem;
          border-radius: 6px;
        }
        .fac-report-row__info h4 {
          font-size: 0.95rem;
          margin: 0 0 0.2rem;
          color: #3D3228;
        }
        .fac-report-row__info p {
          font-size: 0.8rem;
          color: #82776B;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;
        }
        .fac-report-row__meta {
          display: flex;
          gap: 0.85rem;
          flex-wrap: wrap;
          font-size: 0.75rem;
          color: #82776B;
          margin-top: 0.35rem;
        }
        .fac-report-row__meta span {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .fac-report-row__actions {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
        }

        .fac-notif-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .fac-notif-item {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          border: 1px solid #E3D8C9;
          background-color: #FFFDF8;
        }
        .fac-notif-item--unread {
          background-color: #F5F0E8;
          border-color: #C4A484;
        }
        .fac-notif-item__icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background-color: #EDE4D8;
          color: #A67C52;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .fac-notif-item__body {
          flex: 1;
        }
        .fac-notif-item__body strong {
          display: block;
          font-size: 0.88rem;
          color: #3D3228;
        }
        .fac-notif-item__body p {
          margin: 0.2rem 0;
          font-size: 0.8rem;
          color: #82776B;
        }
        .fac-notif-item__body span {
          font-size: 0.7rem;
          color: #82776B;
        }
        .fac-mark-read {
          border: 1px solid #E3D8C9;
          background: #FFFDF8;
          color: #896642;
          border-radius: 999px;
          padding: 0.25rem 0.65rem;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
        }

        .fac-form-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .fac-form-two-col {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }
        .fac-form-three-col {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }

        .fac-type-toggle {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }
        .fac-type-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem;
          border-radius: 12px;
          border: 1px solid #E3D8C9;
          background-color: #F5F0E8;
          color: #3D3228;
          font-weight: 600;
          cursor: pointer;
        }
        .fac-type-btn--active-lost {
          background-color: rgba(185, 107, 96, 0.15);
          border-color: #B96B60;
          color: #3D3228;
        }
        .fac-type-btn--active-found {
          background-color: rgba(111, 139, 112, 0.18);
          border-color: #6F8B70;
          color: #3D3228;
        }

        .fac-photo-upload-box {
          padding: 1rem;
          border: 1px dashed #C4A484;
          border-radius: 12px;
          background-color: #F5F0E8;
        }
        .fac-photo-upload-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .fac-photo-upload-head strong {
          display: block;
          font-size: 0.88rem;
          color: #3D3228;
        }
        .fac-photo-upload-head p {
          margin: 0.15rem 0 0;
          font-size: 0.76rem;
          color: #82776B;
        }
        .fac-upload-trigger {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.95rem;
          border-radius: 999px;
          background-color: #A67C52;
          color: #FFFDF8;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }
        .fac-photo-preview-grid {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 0.85rem;
        }
        .fac-photo-preview-card {
          width: 96px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #E3D8C9;
          background-color: #FFFDF8;
          text-align: center;
        }
        .fac-photo-preview-card img {
          width: 100%;
          height: 72px;
          object-fit: cover;
        }
        .fac-photo-preview-card button {
          width: 100%;
          border: none;
          background: #EDE4D8;
          color: #B96B60;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem;
          cursor: pointer;
        }

        .fac-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
          flex-wrap: wrap;
          margin-bottom: 1.15rem;
        }
        .fac-filter-pills {
          display: flex;
          gap: 0.45rem;
          flex-wrap: wrap;
        }
        .fac-pill {
          padding: 0.42rem 0.85rem;
          border-radius: 999px;
          border: 1px solid #E3D8C9;
          background-color: #F5F0E8;
          color: #82776B;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
        }
        .fac-pill--active {
          background-color: #A67C52;
          border-color: #A67C52;
          color: #FFFDF8;
        }
        .fac-filter-search {
          position: relative;
          display: flex;
          align-items: center;
        }
        .fac-filter-search svg {
          position: absolute;
          left: 0.75rem;
          color: #82776B;
        }
        .fac-filter-search input {
          padding: 0.45rem 0.85rem 0.45rem 2.1rem;
          border-radius: 999px;
          border: 1px solid #E3D8C9;
          background-color: #F5F0E8;
          font-size: 0.8rem;
          color: #3D3228;
        }

        .fac-governance-banner {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          background-color: #EDE4D8;
          border: 1px solid #C4A484;
          color: #3D3228;
          font-size: 0.82rem;
          margin-bottom: 1.15rem;
        }

        .fac-claims-list {
          display: flex;
          flex-direction: column;
          gap: 0.95rem;
        }
        .fac-claim-card {
          padding: 1rem 1.15rem;
          border-radius: 12px;
          border: 1px solid #E3D8C9;
          background-color: #F5F0E8;
        }
        .fac-claim-card__top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 0.45rem;
        }
        .fac-claim-card__top > div {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
        }
        .fac-claim-card h4 {
          margin: 0 0 0.3rem;
          color: #3D3228;
        }
        .fac-claim-card__details {
          margin: 0.2rem 0;
          font-size: 0.82rem;
          color: #82776B;
        }
        .fac-handover-strip {
          margin-top: 0.75rem;
          padding: 0.65rem 0.85rem;
          border-radius: 10px;
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
          font-size: 0.78rem;
        }
        .fac-handover-strip strong {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          color: #6F8B70;
        }
        .fac-qr-pill {
          font-family: monospace;
          font-weight: 700;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          background-color: #EDE4D8;
          color: #3D3228;
        }

        .fac-profile-summary {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 12px;
          background-color: #F5F0E8;
          border: 1px solid #E3D8C9;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }
        .fac-profile-avatar-lg {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #A67C52, #896642);
          color: #FFFDF8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          overflow: hidden;
        }
        .fac-profile-avatar-lg img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .fac-profile-summary h3 {
          margin: 0 0 0.2rem;
          color: #3D3228;
        }
        .fac-profile-summary p {
          margin: 0.1rem 0;
          font-size: 0.8rem;
          color: #82776B;
        }

        .fac-check-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.86rem;
          color: #3D3228;
          cursor: pointer;
        }
        .fac-check-row input {
          width: 18px;
          height: 18px;
          accent-color: #A67C52;
        }

        .fac-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(61, 50, 40, 0.55);
          z-index: 120;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .fac-modal-card {
          width: 100%;
          max-width: 580px;
          padding: 1.5rem;
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          border-radius: 16px;
        }

        .fac-empty-box {
          padding: 2rem;
          text-align: center;
          color: #82776B;
        }

        @media (max-width: 1024px) {
          .fac-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .fac-overview-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .fac-form-three-col {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .fac-stats-grid,
          .fac-form-two-col,
          .fac-form-three-col,
          .fac-type-toggle {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
