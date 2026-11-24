import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Tag,
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  BarChart3,
  ShieldCheck,
  Eye,
  Scan,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Image as ImageIcon,
  FileText,
  Layers,
  Award,
  Search,
  CheckCircle2,
  X,
} from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';
import { useAuth } from '../context/AuthContext';
import { getCategoryLabel } from '../data/mockData';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import MatchCard from '../components/MatchCard';
import EmptyState from '../components/EmptyState';
import ItemImage from '../components/ItemImage';
import Modal from '../components/Modal';
import MatchingMethodToggle from '../components/MatchingMethodToggle';
import AnimatedPhotoMatcher, { useAnimatedCounter } from '../components/AnimatedPhotoMatcher';

const MATCHES_PER_PAGE = 6;

const PIPELINE_NODES = [
  {
    id: 'reports',
    step: '01',
    title: 'Lost/Found Reports',
    tech: 'Structured Campus Records',
    icon: FileText,
  },
  {
    id: 'text',
    step: '02',
    title: 'Text Analysis',
    tech: 'Sentence-BERT + TF-IDF Cosine',
    icon: Sparkles,
  },
  {
    id: 'image',
    step: '03',
    title: 'Image Analysis',
    tech: 'CLIP ViT-B/32 Embeddings',
    icon: ImageIcon,
  },
  {
    id: 'context',
    step: '04',
    title: 'Contextual Comparison',
    tech: 'Category · Location · Date',
    icon: Layers,
  },
  {
    id: 'ranking',
    step: '05',
    title: 'Match Ranking',
    tech: 'Calibrated Multimodal Score',
    icon: Award,
  },
];

export default function MatchResults() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const { isAuthenticated } = useAuth();
  const {
    items = [],
    categories = [],
    locations = [],
    aiMatches = [],
    claims = [],
    isLoading,
    getMatchesForItem,
    submitMatchFeedback,
    showToast,
  } = usePortalData();

  const [selectedSourceId, setSelectedSourceId] = useState(itemId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [algorithm, setAlgorithm] = useState('sbert');
  const [modalityFilter, setModalityFilter] = useState('multimodal');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all'); // 'all' | 'high' | 'medium' | 'low'
  const [feedbackFilter, setFeedbackFilter] = useState('all'); // 'all' | 'active' | 'relevant' | 'not_my_item' | 'incorrect'
  const [dateRangeFilter, setDateRangeFilter] = useState('all'); // 'all' | '7d' | '30d' | '90d'
  const [sortBy, setSortBy] = useState('highest');
  const [showInlineScanner, setShowInlineScanner] = useState(Boolean(itemId));
  const [photoModalMatch, setPhotoModalMatch] = useState(null);
  const [comparingMatch, setComparingMatch] = useState(null);
  const [page, setPage] = useState(1);

  const activeSourceId = itemId || (selectedSourceId !== 'all' ? selectedSourceId : null);
  const sourceItem = activeSourceId ? items.find((i) => i.id === activeSourceId) : null;

  // Baseline unfiltered matches for dashboard overview telemetry (100% real backend records)
  const allComputedMatches = useMemo(() => {
    if (sourceItem) {
      return getMatchesForItem(sourceItem.id, {
        algorithm,
        categoryMode: 'all',
        locationMode: 'all',
        timeWindowDays: 'any',
      });
    }
    const lostItems = items.filter((i) => i.type === 'lost');
    const seen = new Set();
    const list = [];
    lostItems.forEach((lost) => {
      const matches = getMatchesForItem(lost.id, { algorithm });
      matches.forEach((m) => {
        const key = `${m.lostItemId}-${m.foundItemId}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push(m);
        }
      });
    });
    return list.length > 0 ? list : aiMatches;
  }, [sourceItem, items, aiMatches, getMatchesForItem, algorithm]);

  // Real Backend Overview Metrics
  const overviewStats = useMemo(() => {
    const pool = aiMatches.length > 0 && !sourceItem ? aiMatches : allComputedMatches;
    const totalMatches = pool.length;
    const highConfidenceMatches = pool.filter((m) => (m.score ?? m.finalScore ?? 0) >= 0.7).length;
    const imageBasedMatches = pool.filter(
      (m) => m.clipImageScore !== null && m.clipImageScore !== undefined
    ).length;
    const pendingReviews = pool.filter((m) => (m.status || 'active') === 'active').length;
    const resolvedMatches = pool.filter((m) => {
      const lostStatus = String(m.lostItem?.status || '').toLowerCase();
      const foundStatus = String(m.foundItem?.status || '').toLowerCase();
      return (
        lostStatus === 'resolved' ||
        foundStatus === 'returned' ||
        m.status === 'relevant'
      );
    }).length;
    const verifiedRecoveries = Math.max(
      resolvedMatches,
      claims.filter((c) => c.status === 'Approved').length
    );
    return {
      totalMatches,
      highConfidenceMatches,
      imageBasedMatches,
      pendingReviews,
      resolvedMatches,
      verifiedRecoveries,
    };
  }, [aiMatches, allComputedMatches, sourceItem, claims]);

  const animTotalMatches = useAnimatedCounter(
    overviewStats.totalMatches,
    true,
    Boolean(prefersReducedMotion),
    900
  );
  const animHighMatches = useAnimatedCounter(
    overviewStats.highConfidenceMatches,
    true,
    Boolean(prefersReducedMotion),
    950
  );
  const animImageMatches = useAnimatedCounter(
    overviewStats.imageBasedMatches,
    true,
    Boolean(prefersReducedMotion),
    950
  );
  const animVerifiedRecoveries = useAnimatedCounter(
    overviewStats.verifiedRecoveries,
    true,
    Boolean(prefersReducedMotion),
    950
  );

  // Latest reference date across items for accurate date window filtering
  const latestItemTimestamp = useMemo(() => {
    const timestamps = items
      .map((i) => new Date(i.date || i.createdAt).getTime())
      .filter((t) => !Number.isNaN(t));
    return timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
  }, [items]);

  // Filtered & Sorted Matches
  const displayedMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allComputedMatches
      .filter((m) => {
        const lost = m.lostItem;
        const found = m.foundItem || m.matchedItem;
        if (!found) return false;

        if (q) {
          const hay = `${lost?.title || ''} ${lost?.description || ''} ${lost?.reportCode || ''} ${
            found.title || ''
          } ${found.description || ''} ${found.reportCode || ''} ${found.location || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }

        if (
          categoryFilter !== 'all' &&
          found.category !== categoryFilter &&
          lost?.category !== categoryFilter
        ) {
          return false;
        }

        if (
          locationFilter !== 'all' &&
          found.location !== locationFilter &&
          lost?.location !== locationFilter
        ) {
          return false;
        }

        const pct = Math.round((m.score ?? m.finalScore ?? 0) * 100);
        if (tierFilter === 'high' && pct < 70) return false;
        if (tierFilter === 'medium' && (pct < 48 || pct >= 70)) return false;
        if (tierFilter === 'low' && pct >= 48) return false;

        if (feedbackFilter !== 'all' && (m.status || 'active') !== feedbackFilter) {
          return false;
        }

        if (dateRangeFilter !== 'all') {
          const days = dateRangeFilter === '7d' ? 7 : dateRangeFilter === '30d' ? 30 : 90;
          const itemDateMs = new Date(found.date || lost?.date || m.createdAt).getTime();
          if (!Number.isNaN(itemDateMs)) {
            const diffDays = Math.abs(latestItemTimestamp - itemDateMs) / (1000 * 60 * 60 * 24);
            if (diffDays > days) return false;
          }
        }

        if (
          modalityFilter === 'image' &&
          (m.clipImageScore === null || m.clipImageScore === undefined)
        ) {
          return false;
        }

        if (modalityFilter === 'highest' && pct < 60) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest' || modalityFilter === 'newest') {
          return String(b.matchedItem?.date || b.foundItem?.date || b.createdAt).localeCompare(
            String(a.matchedItem?.date || a.foundItem?.date || a.createdAt)
          );
        }
        if (modalityFilter === 'image') {
          return (b.clipImageScore || 0) - (a.clipImageScore || 0) || b.score - a.score;
        }
        if (modalityFilter === 'text') {
          return (b.sbertSimilarity || 0) - (a.sbertSimilarity || 0) || b.score - a.score;
        }
        return (b.score ?? b.finalScore ?? 0) - (a.score ?? a.finalScore ?? 0);
      });
  }, [
    allComputedMatches,
    searchQuery,
    categoryFilter,
    locationFilter,
    tierFilter,
    feedbackFilter,
    dateRangeFilter,
    modalityFilter,
    sortBy,
    latestItemTimestamp,
  ]);

  const totalPages = Math.max(1, Math.ceil(displayedMatches.length / MATCHES_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedMatches = displayedMatches.slice(
    (safePage - 1) * MATCHES_PER_PAGE,
    safePage * MATCHES_PER_PAGE
  );

  const hasCustomFilters =
    searchQuery.trim() !== '' ||
    algorithm !== 'sbert' ||
    modalityFilter !== 'multimodal' ||
    categoryFilter !== 'all' ||
    locationFilter !== 'all' ||
    tierFilter !== 'all' ||
    feedbackFilter !== 'all' ||
    dateRangeFilter !== 'all' ||
    sortBy !== 'highest';

  const resetMatchFilters = () => {
    setSearchQuery('');
    setAlgorithm('sbert');
    setModalityFilter('multimodal');
    setCategoryFilter('all');
    setLocationFilter('all');
    setTierFilter('all');
    setFeedbackFilter('all');
    setDateRangeFilter('all');
    setSortBy('highest');
    setPage(1);
  };

  const handleFeedback = async (match, feedbackType) => {
    if (!isAuthenticated) {
      showToast('Please sign in to record match feedback.', 'error');
      navigate('/login');
      return;
    }
    await submitMatchFeedback(match.id, {
      feedbackType,
      lostItemId: match.lostItemId,
      foundItemId: match.foundItemId,
    });
  };

  if (itemId && !sourceItem) {
    return (
      <section className="section" style={{ paddingTop: 'calc(var(--navbar-height) + 3rem)' }}>
        <div className="container container--narrow">
          <EmptyState
            showIllustration
            title="Report not found"
            description="We could not locate the report associated with this match list."
            action={
              <Button to="/matches" variant="primary">
                <ArrowLeft size={16} aria-hidden="true" /> Return to AI Matching Center
              </Button>
            }
          />
        </div>
      </section>
    );
  }

  return (
    <div className="ai-center-page">
      {/* =====================================================================
          1. MODERN PAGE HEADER: CAMPUS AI MATCHING CENTER
          ===================================================================== */}
      <section className="ai-center-header">
        <div className="ai-center-header__bg-orb" aria-hidden="true" />
        <div className="container">
          <div className="ai-center-header__top">
            <div className="ai-center-header__title-wrap">
              <div className="ai-center-badge-row">
                <span className="ai-center-eyebrow">
                  <motion.span
                    animate={prefersReducedMotion ? {} : { rotate: [0, 12, -12, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ display: 'inline-flex' }}
                  >
                    <Sparkles size={14} aria-hidden="true" />
                  </motion.span>
                  Multimodal Neural &amp; Vision Retrieval
                </span>
                {sourceItem && (
                  <Badge variant="neutral">
                    Inspecting {sourceItem.reportCode || sourceItem.id}
                  </Badge>
                )}
              </div>

              <h1>{sourceItem ? `AI Matches · ${sourceItem.title}` : 'Campus AI Matching Center'}</h1>
              <p className="ai-center-header__lead">
                Discover intelligent connections between lost and found belongings using multimodal
                artificial intelligence.
              </p>

              {/* Header Live Status Telemetry Pills */}
              <div className="ai-header-telemetry" role="list" aria-label="Live matching queue statistics">
                <span role="listitem" className="ai-header-pill">
                  <strong>{overviewStats.totalMatches}</strong> Active Matches
                </span>
                <span role="listitem" className="ai-header-pill">
                  <strong>{overviewStats.highConfidenceMatches}</strong> High-Confidence (&ge;70%)
                </span>
                <span role="listitem" className="ai-header-pill">
                  <strong>{overviewStats.pendingReviews}</strong> Pending Match Reviews
                </span>
                <span role="listitem" className="ai-header-pill ai-header-pill--sage">
                  <strong>{overviewStats.resolvedMatches}</strong> Successfully Resolved
                </span>
              </div>
            </div>

            <div className="ai-center-header__actions">
              <Button
                variant={showInlineScanner ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowInlineScanner((v) => !v)}
              >
                <Scan size={15} aria-hidden="true" />{' '}
                {showInlineScanner ? 'Hide Live Scanner' : 'Launch Animated Photo Match'}
              </Button>
              <Button to="/photo-match" variant="secondary" size="sm">
                <Eye size={15} aria-hidden="true" /> Full Photo Matcher
              </Button>
              <Button to="/evaluation" variant="secondary" size="sm">
                <BarChart3 size={15} aria-hidden="true" /> AI Benchmark Metrics
              </Button>
            </div>
          </div>

          {/* =====================================================================
              2. AI MATCH OVERVIEW DASHBOARD (4 Animated Metric Cards)
              ===================================================================== */}
          <div className="ai-overview-grid" role="region" aria-label="AI Match Overview Metrics">
            <motion.div
              className="ai-metric-card"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="ai-metric-card__icon">
                <Cpu size={20} />
              </div>
              <div className="ai-metric-card__body">
                <span className="ai-metric-card__label">Total AI Matches</span>
                <strong className="ai-metric-card__value">{animTotalMatches}</strong>
                <span className="ai-metric-card__sub">
                  Paired across {items.length} active campus reports
                </span>
              </div>
            </motion.div>

            <motion.div
              className="ai-metric-card"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <div className="ai-metric-card__icon ai-metric-card__icon--amber">
                <Sparkles size={20} />
              </div>
              <div className="ai-metric-card__body">
                <span className="ai-metric-card__label">High Similarity Matches</span>
                <strong className="ai-metric-card__value">{animHighMatches}</strong>
                <span className="ai-metric-card__sub">
                  {overviewStats.totalMatches > 0
                    ? `${Math.round(
                        (overviewStats.highConfidenceMatches / overviewStats.totalMatches) * 100
                      )}% of active matches >= 70%`
                    : 'Ranked >= 70% combined similarity'}
                </span>
              </div>
            </motion.div>

            <motion.div
              className="ai-metric-card"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="ai-metric-card__icon ai-metric-card__icon--tan">
                <ImageIcon size={20} />
              </div>
              <div className="ai-metric-card__body">
                <span className="ai-metric-card__label">Image-Based Matches</span>
                <strong className="ai-metric-card__value">{animImageMatches}</strong>
                <span className="ai-metric-card__sub">
                  Evaluated with 512-d CLIP ViT-B/32 embeddings
                </span>
              </div>
            </motion.div>

            <motion.div
              className="ai-metric-card"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <div className="ai-metric-card__icon ai-metric-card__icon--sage">
                <ShieldCheck size={20} />
              </div>
              <div className="ai-metric-card__body">
                <span className="ai-metric-card__label">Verified Recoveries</span>
                <strong className="ai-metric-card__value">{animVerifiedRecoveries}</strong>
                <span className="ai-metric-card__sub">
                  Approved claims &amp; returned campus belongings
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="section section--compact">
        <div className="container">
          {/* =====================================================================
              3. ADVANCED AI MATCHING INTERFACE (Animated Pipeline Visualization)
              ===================================================================== */}
          <div className="ai-pipeline-panel" aria-label="Multimodal AI Processing Architecture">
            <div className="ai-pipeline-panel__head">
              <div>
                <span className="ai-pipeline-kicker">
                  <Cpu size={14} /> Active Multimodal Retrieval Pipeline
                </span>
                <h2>How CampusFind Scores Every Lost &amp; Found Pair</h2>
              </div>
              {displayedMatches[0] && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setPhotoModalMatch(displayedMatches[0])}
                >
                  <Eye size={14} /> Inspect Top Match in Photo Studio
                </Button>
              )}
            </div>

            <div className="ai-pipeline-flow">
              {PIPELINE_NODES.map((node, idx) => {
                const Icon = node.icon;
                return (
                  <div key={node.id} className="ai-pipeline-step-wrap">
                    <motion.div
                      className="ai-pipeline-step"
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.3, delay: idx * 0.06 }}
                    >
                      <div className="ai-pipeline-step__top">
                        <span className="ai-pipeline-step__num">{node.step}</span>
                        <span className="ai-pipeline-step__icon">
                          <Icon size={16} />
                        </span>
                      </div>
                      <strong>{node.title}</strong>
                      <small>{node.tech}</small>
                    </motion.div>

                    {idx < PIPELINE_NODES.length - 1 && (
                      <div className="ai-pipeline-connector" aria-hidden="true">
                        <span className="ai-pipeline-connector__bar" />
                        {!prefersReducedMotion && (
                          <motion.span
                            className="ai-pipeline-connector__dot"
                            animate={{ left: ['15%', '80%', '15%'] }}
                            transition={{ duration: 2.2, repeat: Infinity, delay: idx * 0.25 }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Toggleable Inline Animated Scanner */}
          {showInlineScanner && displayedMatches[0] && (
            <div style={{ marginBottom: '1.5rem' }}>
              <AnimatedPhotoMatcher
                match={displayedMatches[0]}
                allMatches={displayedMatches}
                candidateItems={items}
                autoPlay={true}
                initialStage={0}
                onClose={() => setShowInlineScanner(false)}
                onSideBySide={(m) => setComparingMatch(m)}
              />
            </div>
          )}

          {/* Source Report Banner (when inspecting a specific report) */}
          {sourceItem ? (
            <Card sand compact style={{ marginBottom: '1.35rem' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <Badge status={sourceItem.type} />
                  <Badge status={sourceItem.status} />
                  {sourceItem.reportCode && <Badge variant="neutral">{sourceItem.reportCode}</Badge>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button
                    to="/matches"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedSourceId('all')}
                  >
                    All Campus Matches
                  </Button>
                  <Button to="/dashboard" variant="ghost" size="sm">
                    <ArrowLeft size={15} aria-hidden="true" /> Dashboard
                  </Button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <ItemImage item={sourceItem} variant="thumb" large eager />
                <div style={{ minWidth: '220px', flex: 1 }}>
                  <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: '0.3rem' }}>
                    {sourceItem.title}
                  </h2>
                  <p style={{ fontSize: 'var(--text-sm)', marginBottom: '0.55rem' }}>
                    {sourceItem.description}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.6rem 1.25rem',
                      fontSize: 'var(--text-xs)',
                      color: '#82776B',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Tag size={13} /> {getCategoryLabel(sourceItem.category)}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <MapPin size={13} /> {sourceItem.location}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={13} /> {sourceItem.date}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {/* =====================================================================
              6. ADVANCED SEARCH AND FILTERS TOOLBAR
              ===================================================================== */}
          <Card
            compact
            className="match-toolbar"
            as="section"
            aria-label="Search, matching method, and attribute filters"
          >
            <div className="match-toolbar__head">
              <div className="match-toolbar__title">
                <SlidersHorizontal size={17} aria-hidden="true" />
                <span>Advanced AI Search &amp; Match Filters</span>
              </div>
              {hasCustomFilters && (
                <Button variant="secondary" size="sm" onClick={resetMatchFilters}>
                  <RotateCcw size={14} aria-hidden="true" /> Clear All Filters
                </Button>
              )}
            </div>

            {/* Search by Item Name / Description + Specific Report Selector */}
            <div className="match-toolbar__search-row">
              <div className="match-search-input-wrap">
                <Search size={16} className="match-search-input-icon" aria-hidden="true" />
                <input
                  type="search"
                  className="form-input match-search-input"
                  placeholder="Search matches by item name, description, code, or location..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Search matches by item name or description"
                />
              </div>

              {!itemId && (
                <select
                  id="source-report-select"
                  className="form-select"
                  value={selectedSourceId}
                  onChange={(e) => {
                    setSelectedSourceId(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Inspect matches for a specific report"
                >
                  <option value="all">All Active Lost ↔ Found Pairs</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      [{it.type.toUpperCase()} · {it.reportCode || it.id}] {it.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Matching Method (Sentence-BERT vs TF-IDF Cosine) */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <span className="form-label" id="algo-toggle-label">
                Matching Method
              </span>
              <MatchingMethodToggle
                variant="cards"
                value={algorithm}
                onChange={(val) => {
                  setAlgorithm(val);
                  setPage(1);
                }}
                labelId="algo-toggle-label"
              />
            </div>

            {/* Modality & Ranking Chips */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <span className="form-label">Modality &amp; Ranking Focus</span>
              <div className="match-chip-row" role="group" aria-label="Modality and ranking filters">
                {[
                  { id: 'multimodal', label: 'Multimodal Matches' },
                  { id: 'image', label: 'Image Matches' },
                  { id: 'text', label: 'Text Matches' },
                  { id: 'highest', label: 'Highest Ranking' },
                  { id: 'newest', label: 'Newest Matches' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setModalityFilter(f.id);
                      if (f.id === 'newest') setSortBy('newest');
                      if (f.id === 'highest') setSortBy('highest');
                      setPage(1);
                    }}
                    aria-pressed={modalityFilter === f.id}
                    className={`match-filter-chip ${
                      modalityFilter === f.id ? 'match-filter-chip--active' : ''
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5 Dropdown Filters: Category, Location, Match Status, Feedback Status, Date Range */}
            <div className="match-toolbar__dropdowns">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="match-category-filter" className="form-label">
                  Category
                </label>
                <select
                  id="match-category-filter"
                  className="form-select"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="match-location-filter" className="form-label">
                  Campus Location
                </label>
                <select
                  id="match-location-filter"
                  className="form-select"
                  value={locationFilter}
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="match-tier-filter" className="form-label">
                  Match Status
                </label>
                <select
                  id="match-tier-filter"
                  className="form-select"
                  value={tierFilter}
                  onChange={(e) => {
                    setTierFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Similarity Tiers</option>
                  <option value="high">High Similarity (&ge;70%)</option>
                  <option value="medium">Medium Similarity (48–69%)</option>
                  <option value="low">Low Similarity (&lt;48%)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="match-feedback-filter" className="form-label">
                  Feedback Status
                </label>
                <select
                  id="match-feedback-filter"
                  className="form-select"
                  value={feedbackFilter}
                  onChange={(e) => {
                    setFeedbackFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Feedback Statuses</option>
                  <option value="active">Pending Review</option>
                  <option value="relevant">Relevant Match</option>
                  <option value="not_my_item">Not My Item</option>
                  <option value="incorrect">Incorrect Match</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="match-date-filter" className="form-label">
                  Date Range
                </label>
                <select
                  id="match-date-filter"
                  className="form-select"
                  value={dateRangeFilter}
                  onChange={(e) => {
                    setDateRangeFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Dates</option>
                  <option value="7d">Within 7 Days</option>
                  <option value="30d">Within 30 Days</option>
                  <option value="90d">Within 90 Days</option>
                </select>
              </div>
            </div>
          </Card>

          <div className="match-results-bar" aria-live="polite">
            <p className="match-results-bar__count">
              Showing <strong>{paginatedMatches.length}</strong> of{' '}
              <strong>{displayedMatches.length}</strong> ranked match
              {displayedMatches.length === 1 ? '' : 'es'} via{' '}
              <strong>
                {algorithm === 'sbert'
                  ? 'Sentence-BERT + TF-IDF + CLIP ViT-B/32 + Context'
                  : 'TF-IDF Cosine Baseline'}
              </strong>
            </p>
            <span className="match-results-bar__note">
              <CheckCircle2 size={13} aria-hidden="true" /> Similarity scores reflect statistical
              visual/text alignment; administrative ID verification confirms ownership.
            </span>
          </div>

          {/* Loading Skeletons or Ranked Match Cards */}
          {isLoading ? (
            <div className="ai-skeleton-stack" aria-label="Loading AI matches">
              {[1, 2, 3].map((k) => (
                <div key={k} className="ai-skeleton-card" />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {paginatedMatches.length > 0 ? (
                <motion.div
                  key={`${algorithm}-${modalityFilter}-${categoryFilter}-${locationFilter}-${tierFilter}-${feedbackFilter}-${dateRangeFilter}-${safePage}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                >
                  {paginatedMatches.map((match, idx) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      rank={(safePage - 1) * MATCHES_PER_PAGE + idx + 1}
                      onCompare={(m) => setComparingMatch(m)}
                      onAnimatedPhotoMatch={(m) => setPhotoModalMatch(m)}
                      onFeedback={handleFeedback}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty-matches"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <EmptyState
                    icon={Sparkles}
                    showIllustration
                    title="No AI matches found for these filters"
                    description="Try clearing one or more attribute filters or switching between Multimodal and TF-IDF Cosine matching methods."
                    action={
                      hasCustomFilters ? (
                        <Button variant="primary" onClick={resetMatchFilters}>
                          Clear All Filters
                        </Button>
                      ) : (
                        <Button to="/browse" variant="secondary">
                          Browse All Campus Reports
                        </Button>
                      )
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <nav
              aria-label="Matches pagination"
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '2rem',
                flexWrap: 'wrap',
              }}
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={15} /> Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  className={`btn btn--sm ${pNum === safePage ? 'btn--primary' : 'btn--secondary'}`}
                  onClick={() => setPage(pNum)}
                >
                  {pNum}
                </button>
              ))}
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight size={15} />
              </Button>
            </nav>
          )}
        </div>
      </section>

      {/* =====================================================================
          5. ADVANCED ANIMATED PHOTO COMPARISON FULL-SCREEN MODAL
          ===================================================================== */}
      {photoModalMatch && (
        <div
          className="ai-photo-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Interactive Animated Photo Match Comparison"
        >
          <div className="ai-photo-modal-shell">
            <div className="ai-photo-modal-topbar">
              <div className="ai-photo-modal-topbar__title">
                <Sparkles size={16} aria-hidden="true" />
                <span>Interactive Animated AI Photo Comparison</span>
              </div>
              <button
                type="button"
                className="ai-photo-modal-close"
                onClick={() => setPhotoModalMatch(null)}
                aria-label="Close animated photo comparison modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="ai-photo-modal-body">
              <AnimatedPhotoMatcher
                key={`modal-${photoModalMatch.id}`}
                match={photoModalMatch}
                allMatches={displayedMatches}
                candidateItems={items}
                autoPlay={true}
                initialStage={0}
                onClose={() => setPhotoModalMatch(null)}
                onSideBySide={(m) => {
                  setPhotoModalMatch(null);
                  setComparingMatch(m);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      <Modal
        isOpen={Boolean(comparingMatch)}
        onClose={() => setComparingMatch(null)}
        title="Side-by-Side Lost vs. Found Comparison"
      >
        {comparingMatch && comparingMatch.lostItem && comparingMatch.foundItem && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <Badge status="matched">
                {Math.round(comparingMatch.score * 100)}% · {comparingMatch.strengthLabel}
              </Badge>
              <span style={{ fontSize: 'var(--text-xs)', color: '#82776B' }}>
                Sentence-BERT: <strong>{comparingMatch.sbertSimilarity?.toFixed(2)}</strong> ·
                TF-IDF: <strong>{comparingMatch.tfidfCosine?.toFixed(2)}</strong>
                {comparingMatch.clipImageScore != null && (
                  <>
                    {' '}
                    · CLIP Image: <strong>{Number(comparingMatch.clipImageScore).toFixed(2)}</strong>
                  </>
                )}
              </span>
            </div>

            <div className="compare-grid">
              {[
                { label: 'Lost Report', item: comparingMatch.lostItem, badge: 'lost' },
                { label: 'Found Report', item: comparingMatch.foundItem, badge: 'found' },
              ].map((col, idx) => (
                <motion.div
                  key={col.label}
                  className="compare-col"
                  initial={{ opacity: 0, x: idx === 0 ? -15 : 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <Badge status={col.badge} />
                    <span style={{ fontSize: 'var(--text-xs)', color: '#82776B' }}>
                      {col.item.reportCode || col.item.id}
                    </span>
                  </div>
                  <ItemImage item={col.item} />
                  <h3 style={{ fontSize: 'var(--text-lg)', marginTop: '0.6rem', marginBottom: '0.3rem' }}>
                    {col.item.title}
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', marginBottom: '0.65rem' }}>
                    {col.item.description}
                  </p>
                  <dl className="compare-dl">
                    <div>
                      <dt>Category</dt>
                      <dd>{getCategoryLabel(col.item.category)}</dd>
                    </div>
                    <div>
                      <dt>Color / Brand</dt>
                      <dd>
                        {col.item.color || '—'} {col.item.brand ? `· ${col.item.brand}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>{col.item.location}</dd>
                    </div>
                    <div>
                      <dt>Date &amp; Time</dt>
                      <dd>
                        {col.item.date} {col.item.time ? `at ${col.item.time}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt>Distinguishing Features</dt>
                      <dd>{col.item.distinguishingFeatures || 'None listed'}</dd>
                    </div>
                  </dl>
                </motion.div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.65rem',
                marginTop: '1.25rem',
                flexWrap: 'wrap',
              }}
            >
              <Button variant="secondary" onClick={() => setComparingMatch(null)}>
                Close
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const target = comparingMatch;
                  setComparingMatch(null);
                  setPhotoModalMatch(target);
                }}
              >
                <Eye size={15} /> Animated Photo Match
              </Button>
              <Button
                to={`/claim/${comparingMatch.foundItem.id}?lostItemId=${comparingMatch.lostItem.id}`}
                variant="primary"
              >
                <ShieldCheck size={15} /> Submit Ownership Claim
              </Button>
            </div>
          </motion.div>
        )}
      </Modal>

      <style>{`
        .ai-center-page {
          background-color: #F5F0E8;
        }

        .ai-center-header {
          position: relative;
          padding-top: calc(var(--navbar-height) + clamp(1.75rem, 4vw, 3rem));
          padding-bottom: clamp(1.75rem, 3.5vw, 2.75rem);
          background: linear-gradient(180deg, #EDE4D8 0%, #F5F0E8 100%);
          border-bottom: 1px solid #E3D8C9;
          overflow: hidden;
        }
        .ai-center-header__bg-orb {
          position: absolute;
          top: -90px;
          right: -90px;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(196, 164, 132, 0.25) 0%, transparent 70%);
          pointer-events: none;
        }
        .ai-center-header__top {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1.25rem;
          margin-bottom: 1.75rem;
          position: relative;
        }
        .ai-center-header__title-wrap {
          max-width: 720px;
        }
        .ai-center-badge-row {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          flex-wrap: wrap;
          margin-bottom: 0.6rem;
        }
        .ai-center-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.28rem 0.78rem;
          border-radius: 999px;
          background-color: #FFFDF8;
          border: 1px solid #C4A484;
          color: #896642;
          font-size: 0.73rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .ai-center-header h1 {
          font-size: clamp(1.85rem, 3.8vw, 2.75rem);
          color: #3D3228;
          margin-bottom: 0.45rem;
        }
        .ai-center-header__lead {
          font-size: clamp(0.95rem, 1.3vw, 1.08rem);
          color: #82776B;
          margin-bottom: 1rem;
        }
        .ai-header-telemetry {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .ai-header-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.3rem 0.75rem;
          border-radius: 999px;
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          font-size: 0.76rem;
          color: #82776B;
        }
        .ai-header-pill strong {
          color: #3D3228;
        }
        .ai-header-pill--sage {
          border-color: rgba(111, 139, 112, 0.45);
          background-color: rgba(111, 139, 112, 0.12);
          color: #4D6A4E;
        }
        .ai-center-header__actions {
          display: flex;
          gap: 0.55rem;
          flex-wrap: wrap;
        }

        /* 2. AI Match Overview Dashboard */
        .ai-overview-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.95rem;
          position: relative;
        }
        .ai-metric-card {
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          border-radius: 16px;
          padding: 1.1rem 1.2rem;
          box-shadow: var(--shadow-sm);
          display: flex;
          align-items: flex-start;
          gap: 0.9rem;
        }
        .ai-metric-card__icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background-color: rgba(166, 124, 82, 0.16);
          color: #896642;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ai-metric-card__icon--amber {
          background-color: rgba(196, 154, 82, 0.18);
          color: #9C742B;
        }
        .ai-metric-card__icon--tan {
          background-color: rgba(196, 164, 132, 0.22);
          color: #896642;
        }
        .ai-metric-card__icon--sage {
          background-color: rgba(111, 139, 112, 0.16);
          color: #557056;
        }
        .ai-metric-card__label {
          display: block;
          font-size: 0.74rem;
          font-weight: 700;
          color: #82776B;
          margin-bottom: 0.15rem;
        }
        .ai-metric-card__value {
          display: block;
          font-family: var(--font-serif);
          font-size: 1.85rem;
          color: #3D3228;
          line-height: 1.05;
        }
        .ai-metric-card__sub {
          display: block;
          font-size: 0.72rem;
          color: #82776B;
          margin-top: 0.28rem;
        }

        /* 3. Advanced AI Pipeline Panel */
        .ai-pipeline-panel {
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          border-radius: 18px;
          padding: clamp(1rem, 2.4vw, 1.5rem);
          margin-bottom: 1.4rem;
          box-shadow: var(--shadow-sm);
        }
        .ai-pipeline-panel__head {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
          margin-bottom: 1.1rem;
        }
        .ai-pipeline-kicker {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #A67C52;
        }
        .ai-pipeline-panel__head h2 {
          font-size: clamp(1.15rem, 2vw, 1.4rem);
          margin: 0.2rem 0 0;
          color: #3D3228;
        }
        .ai-pipeline-flow {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 0.55rem;
          align-items: center;
        }
        .ai-pipeline-step-wrap {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          min-width: 0;
        }
        .ai-pipeline-step {
          flex: 1;
          background-color: #F5F0E8;
          border: 1px solid #E3D8C9;
          border-radius: 12px;
          padding: 0.8rem 0.85rem;
          min-width: 0;
        }
        .ai-pipeline-step__top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.35rem;
        }
        .ai-pipeline-step__num {
          font-size: 0.68rem;
          font-weight: 700;
          color: #A67C52;
        }
        .ai-pipeline-step__icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          color: #896642;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ai-pipeline-step strong {
          display: block;
          font-size: 0.84rem;
          color: #3D3228;
          margin-bottom: 0.15rem;
        }
        .ai-pipeline-step small {
          display: block;
          font-size: 0.71rem;
          color: #82776B;
          line-height: 1.3;
        }
        .ai-pipeline-connector {
          position: relative;
          width: 22px;
          height: 10px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }
        .ai-pipeline-connector__bar {
          width: 100%;
          height: 2px;
          background-color: #C4A484;
          border-radius: 999px;
        }
        .ai-pipeline-connector__dot {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #A67C52;
        }

        /* 6. Advanced Search & Filters Toolbar */
        .match-toolbar {
          margin-bottom: 1.25rem;
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          border-radius: 16px;
        }
        .match-toolbar__head {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .match-toolbar__title {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          font-size: 0.92rem;
          color: #3D3228;
        }
        .match-toolbar__title svg {
          color: #A67C52;
        }
        .match-toolbar__search-row {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 0.85rem;
          margin-bottom: 1rem;
        }
        .match-search-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .match-search-input-icon {
          position: absolute;
          left: 0.85rem;
          color: #82776B;
          pointer-events: none;
        }
        .match-search-input {
          padding-left: 2.35rem !important;
        }
        .match-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }
        .match-filter-chip {
          padding: 0.36rem 0.8rem;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid #E3D8C9;
          background-color: #F5F0E8;
          color: #82776B;
          transition: all 0.16s ease;
        }
        .match-filter-chip:hover {
          border-color: #A67C52;
          color: #3D3228;
        }
        .match-filter-chip--active {
          background-color: #A67C52;
          border-color: #A67C52;
          color: #FFFDF8;
        }
        .match-toolbar__dropdowns {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .match-results-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem 1rem;
          margin-bottom: 1rem;
          font-size: 0.84rem;
          color: #82776B;
        }
        .match-results-bar__count {
          margin: 0;
        }
        .match-results-bar__count strong {
          color: #3D3228;
        }
        .match-results-bar__note {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.74rem;
          color: #6F8B70;
          font-weight: 600;
        }

        .ai-skeleton-stack {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .ai-skeleton-card {
          height: 240px;
          border-radius: 18px;
          background: linear-gradient(90deg, #EDE4D8 25%, #FFFDF8 50%, #EDE4D8 75%);
          background-size: 200% 100%;
          animation: skeletonPulse 1.4s ease-in-out infinite;
          border: 1px solid #E3D8C9;
        }
        @keyframes skeletonPulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* 5. Fullscreen / Large Photo Modal */
        .ai-photo-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(61, 50, 40, 0.65);
          backdrop-filter: blur(4px);
          z-index: 250;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(0.6rem, 2vw, 1.5rem);
        }
        .ai-photo-modal-shell {
          width: 100%;
          max-width: 1100px;
          max-height: 92vh;
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          border-radius: 20px;
          box-shadow: var(--shadow-xl);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .ai-photo-modal-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1.25rem;
          background-color: #EDE4D8;
          border-bottom: 1px solid #E3D8C9;
        }
        .ai-photo-modal-topbar__title {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-weight: 700;
          font-size: 0.92rem;
          color: #3D3228;
        }
        .ai-photo-modal-topbar__title svg {
          color: #A67C52;
        }
        .ai-photo-modal-close {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid #C4A484;
          background-color: #FFFDF8;
          color: #3D3228;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .ai-photo-modal-body {
          overflow-y: auto;
          padding: clamp(0.85rem, 2vw, 1.35rem);
        }

        .compare-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        @media (min-width: 600px) {
          .compare-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .compare-col {
          background-color: #F5F0E8;
          border: 1px solid #E3D8C9;
          border-radius: 12px;
          padding: 0.9rem;
        }
        .compare-dl {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          font-size: 0.76rem;
        }
        .compare-dl div {
          display: flex;
          justify-content: space-between;
          gap: 0.5rem;
          border-top: 1px dashed #E3D8C9;
          padding-top: 0.35rem;
        }
        .compare-dl dt {
          color: #82776B;
          font-weight: 600;
        }
        .compare-dl dd {
          color: #3D3228;
          font-weight: 600;
          text-align: right;
        }

        @media (max-width: 1100px) {
          .ai-overview-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .ai-pipeline-flow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .ai-pipeline-connector {
            display: none;
          }
          .match-toolbar__dropdowns {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .match-toolbar__search-row,
          .match-toolbar__dropdowns {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 520px) {
          .ai-overview-grid,
          .ai-pipeline-flow {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
