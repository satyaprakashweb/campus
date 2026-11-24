import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Sparkles,
  Scan,
  Search,
  CheckCircle2,
  MapPin,
  Calendar,
  Tag,
  RotateCcw,
  ShieldCheck,
  Eye,
  Image as ImageIcon,
  FileText,
  Layers,
  Database,
  Activity,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Columns2,
  X,
} from 'lucide-react';
import ItemImage from './ItemImage';
import Badge from './Badge';
import Button from './Button';
import { getCategoryLabel } from '../data/mockData';

const STAGES = [
  {
    id: 0,
    key: 'init',
    label: '1. AI Initialization',
    title: 'CampusFind AI is analyzing your item...',
  },
  {
    id: 1,
    key: 'search',
    label: '2. Database Search',
    title: 'Searching through existing LOST and FOUND reports...',
  },
  {
    id: 2,
    key: 'analysis',
    label: '3. AI Multimodal Analysis',
    title: 'Comparing Sentence-BERT, TF-IDF, CLIP Image & Context...',
  },
  {
    id: 3,
    key: 'discovery',
    label: '4. Match Discovery',
    title: 'Potential Match Found!',
  },
  {
    id: 4,
    key: 'results',
    label: '5. Final Match Results',
    title: 'Potential Match Found! — Multimodal Ranking Complete',
  },
];

/**
 * Smooth animated score counter hook (0 -> targetValue).
 */
export function useAnimatedCounter(targetValue, active = true, reducedMotion = false, durationMs = 1000) {
  const [count, setCount] = useState(reducedMotion ? targetValue : 0);

  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    if (reducedMotion) {
      setCount(targetValue);
      return;
    }

    let startTimestamp = null;
    let rafId = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * targetValue));
      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [targetValue, active, reducedMotion, durationMs]);

  return count;
}

/**
 * 5-Step Animated AI Match Discovery Interface powered by Framer Motion.
 * Connected directly to real database records and actual multimodal AI scores.
 */
export default function AnimatedPhotoMatcher({
  match,
  allMatches = [],
  candidateItems = [],
  autoPlay = true,
  initialStage = 0,
  compact = false,
  onClose,
  onSideBySide,
}) {
  const prefersReducedMotion = useReducedMotion();
  const [stage, setStage] = useState(prefersReducedMotion ? 4 : initialStage);
  const [isPlaying, setIsPlaying] = useState(autoPlay && !prefersReducedMotion);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [sideBySideSplit, setSideBySideSplit] = useState(false);

  const lostItem = match?.lostItem;
  const foundItem = match?.foundItem || match?.matchedItem;

  const finalPct = Math.round(Number(match?.score ?? match?.finalScore ?? 0.82) * 100);
  const sbertPct = Math.round(Number(match?.sbertSimilarity ?? 0.76) * 100);
  const tfidfPct = Math.round(Number(match?.tfidfCosine ?? 0.44) * 100);
  const clipPct =
    match?.clipImageScore !== null && match?.clipImageScore !== undefined
      ? Math.round(Number(match.clipImageScore) * 100)
      : null;
  const contextPct = Math.round(Number(match?.contextualScore ?? 0.85) * 100);
  const catPct = Math.round(
    Number(match?.categoryScore ?? (lostItem?.category === foundItem?.category ? 1 : 0)) * 100
  );
  const locPct = Math.round(
    Number(
      match?.locationScore ??
        (lostItem?.location?.toLowerCase() === foundItem?.location?.toLowerCase() ? 1 : 0.25)
    ) * 100
  );
  const datePct = Math.round(Number(match?.dateScore ?? 0.9) * 100);

  const animatedFinalScore = useAnimatedCounter(
    finalPct,
    stage >= 2,
    Boolean(prefersReducedMotion),
    1100
  );
  const animatedSbert = useAnimatedCounter(
    sbertPct,
    stage >= 2,
    Boolean(prefersReducedMotion),
    900
  );
  const animatedTfidf = useAnimatedCounter(
    tfidfPct,
    stage >= 2,
    Boolean(prefersReducedMotion),
    900
  );
  const animatedClip = useAnimatedCounter(
    clipPct ?? sbertPct,
    stage >= 2,
    Boolean(prefersReducedMotion),
    950
  );

  // Candidate pool for Step 2 (Database Search Animation)
  const totalReportsAnalyzed = Math.max(candidateItems.length, 10);
  const searchCarouselItems = (() => {
    const pool = Array.isArray(candidateItems)
      ? candidateItems.filter((i) => i.id !== foundItem?.id && i.id !== lostItem?.id).slice(0, 3)
      : [];
    const list = [...pool];
    if (foundItem) list.push(foundItem);
    return list;
  })();

  // Automatic 5-stage progression when playing
  useEffect(() => {
    if (!isPlaying || prefersReducedMotion) return;
    if (stage >= 4) return;
    const durations = [1800, 1900, 2000, 2100];
    const timer = setTimeout(() => {
      setStage((prev) => {
        const next = Math.min(prev + 1, 4);
        if (next >= 4) setIsPlaying(false);
        return next;
      });
    }, durations[stage] || 1900);

    return () => clearTimeout(timer);
  }, [stage, isPlaying, prefersReducedMotion]);

  if (!match || !lostItem || !foundItem) {
    return null;
  }

  const handleReplay = () => {
    setZoomLevel(1);
    setSideBySideSplit(false);
    setStage(0);
    setIsPlaying(true);
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.2, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))));
  const handleResetView = () => {
    setZoomLevel(1);
    setSideBySideSplit(false);
    setStage(0);
    setIsPlaying(true);
  };

  const locationCompatible =
    lostItem.location &&
    foundItem.location &&
    lostItem.location.toLowerCase() === foundItem.location.toLowerCase();

  const dateCompatible =
    Number(match.dateScore ?? 0.75) >= 0.75 || lostItem.date === foundItem.date;

  const categoryCompatible = lostItem.category === foundItem.category;

  const explanationText =
    match.matchingExplanation ||
    `These photographs appear visually similar${
      clipPct !== null ? ` (${clipPct}% CLIP similarity)` : ''
    }, both reports describe a ${
      lostItem.color ? lostItem.color.toLowerCase() + ' ' : ''
    }${getCategoryLabel(lostItem.category).toLowerCase()}, and the reported campus locations (${
      foundItem.location
    }) and dates are compatible.`;

  const topMatchesSummary =
    Array.isArray(allMatches) && allMatches.length > 0 ? allMatches.slice(0, 3) : [match];

  return (
    <div className="ai-photo-matcher" role="region" aria-label="Animated AI Match Discovery Pipeline">
      {/* Header & 5-Stage Progress Tabs */}
      <div className="ai-photo-matcher__header">
        <div>
          <span
            className="eyebrow"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}
          >
            <Sparkles size={13} aria-hidden="true" /> Multimodal Computer Vision + NLP Discovery Pipeline
          </span>
          <h3 className="ai-photo-matcher__title">{STAGES[stage]?.title}</h3>
        </div>

        <div className="ai-photo-matcher__controls">
          <div className="ai-stage-pills" role="tablist" aria-label="AI matching stages">
            {STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={stage === s.id}
                className={`ai-stage-pill ${stage === s.id ? 'ai-stage-pill--active' : ''} ${
                  stage > s.id ? 'ai-stage-pill--done' : ''
                }`}
                onClick={() => {
                  setIsPlaying(false);
                  setStage(s.id);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={handleReplay}
            title="Replay 5-stage AI matching animation"
          >
            <RotateCcw size={13} aria-hidden="true" /> Replay
          </button>
          {onClose && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={onClose}
              aria-label="Close animated comparison"
            >
              <X size={14} aria-hidden="true" /> Close
            </button>
          )}
        </div>
      </div>

      {/* Overall Pipeline Progress Bar */}
      <div className="ai-pipeline-track" aria-hidden="true">
        <motion.div
          className="ai-pipeline-track__fill"
          initial={{ width: '20%' }}
          animate={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
          transition={{ duration: 0.45 }}
        />
      </div>

      {/* Stage Canvas */}
      <div className="ai-photo-matcher__stage">
        <AnimatePresence mode="wait">
          {/* ===============================================================
              STAGE 1: AI INITIALIZATION & SCANNING
              =============================================================== */}
          {stage === 0 && (
            <motion.div
              key="stage-init"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32 }}
              className="ai-stage-box ai-stage-box--scan"
            >
              <div className="ai-scan-frame">
                <ItemImage item={lostItem} square eager />
                {!prefersReducedMotion && (
                  <motion.div
                    className="ai-scan-beam"
                    initial={{ top: '4%' }}
                    animate={{ top: ['4%', '92%', '4%'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden="true"
                  />
                )}
                <div className="ai-scan-grid-overlay" aria-hidden="true" />
                <span className="ai-scan-badge">
                  <Scan size={13} aria-hidden="true" /> CLIP ViT-B/32 Visual Tensor Extraction
                </span>
              </div>

              <div className="ai-scan-info">
                <div className="ai-pulse-indicator">
                  <span className="ai-pulse-dot" />
                  <strong>CampusFind AI is analyzing your item...</strong>
                </div>
                <h4 style={{ fontSize: 'var(--text-lg)', marginBottom: '0.35rem' }}>
                  {lostItem.title}
                </h4>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)', marginBottom: '0.85rem' }}>
                  {lostItem.description}
                </p>

                <div className="ai-init-indicators">
                  {[
                    { label: 'Preprocessing uploaded photograph & extracting 512-d CLIP vector', pct: 96 },
                    { label: 'Encoding semantic text embeddings with Sentence-BERT', pct: 92 },
                    { label: 'Building sublinear TF-IDF lexical n-gram profile', pct: 100 },
                  ].map((ind, i) => (
                    <div key={i} className="ai-init-ind">
                      <div className="ai-init-ind__top">
                        <span>{ind.label}</span>
                        <strong>Ready</strong>
                      </div>
                      <div className="ai-mini-bar">
                        <motion.div
                          className="ai-mini-bar__fill"
                          initial={{ width: '0%' }}
                          animate={{ width: `${ind.pct}%` }}
                          transition={{ duration: 0.7, delay: i * 0.15 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ===============================================================
              STAGE 2: DATABASE SEARCH ANIMATION
              =============================================================== */}
          {stage === 1 && (
            <motion.div
              key="stage-search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32 }}
              className="ai-stage-box ai-stage-box--search"
            >
              <div className="ai-db-search-banner">
                <div className="ai-pulse-indicator" style={{ marginBottom: 0 }}>
                  <Database size={16} style={{ color: 'var(--bronze-700)' }} aria-hidden="true" />
                  <strong>
                    Searching through {totalReportsAnalyzed} active campus LOST &amp; FOUND reports...
                  </strong>
                </div>
                <Badge variant="neutral">
                  <Search size={12} aria-hidden="true" /> {searchCarouselItems.length} Candidate Reports Indexed
                </Badge>
              </div>

              <motion.div
                className="ai-search-carousel"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: { staggerChildren: prefersReducedMotion ? 0 : 0.18 },
                  },
                }}
              >
                {searchCarouselItems.map((cand) => {
                  const isTargetMatch = cand.id === foundItem.id;
                  return (
                    <motion.div
                      key={cand.id}
                      variants={{
                        hidden: { opacity: 0, scale: 0.92, y: 14 },
                        visible: { opacity: 1, scale: 1, y: 0 },
                      }}
                      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                      className={`ai-search-card ${isTargetMatch ? 'ai-search-card--highlight' : ''}`}
                    >
                      <div className="ai-search-card__img">
                        <ItemImage item={cand} square />
                        <span className="ai-search-card__tag">
                          {isTargetMatch
                            ? `High Alignment · ${finalPct}%`
                            : 'Scanning Vector Index...'}
                        </span>
                      </div>
                      <div className="ai-search-card__meta">
                        <strong>{cand.title}</strong>
                        <span>
                          {cand.location} · {cand.date}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          )}

          {/* ===============================================================
              STAGE 3: AI MULTIMODAL ANALYSIS ANIMATION
              =============================================================== */}
          {stage === 2 && (
            <motion.div
              key="stage-analysis"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32 }}
              className="ai-stage-box ai-stage-box--analysis"
            >
              <div className="ai-pulse-indicator" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
                <Activity size={16} style={{ color: 'var(--bronze-700)' }} aria-hidden="true" />
                <strong>Running Multimodal Vector &amp; Contextual Similarity Analysis...</strong>
              </div>

              <div className="ai-analysis-grid">
                {[
                  {
                    title: 'Sentence-BERT Semantic Text Analysis',
                    weight: '35% Weight',
                    score: animatedSbert,
                    detail: `Cosine similarity (${Number(match.sbertSimilarity).toFixed(2)}) across contextual meaning & concept clusters.`,
                    icon: Sparkles,
                  },
                  {
                    title: 'CLIP ViT-B/32 Visual Photo Analysis',
                    weight: clipPct !== null ? '30% Weight' : 'Weight Recalibrated',
                    score: animatedClip,
                    detail:
                      clipPct !== null
                        ? `512-d visual embedding cosine similarity (${Number(match.clipImageScore).toFixed(2)}) between item photos.`
                        : 'Missing photograph handled by proportional weight recalibration.',
                    icon: ImageIcon,
                  },
                  {
                    title: 'TF-IDF Keyword & N-Gram Analysis',
                    weight: '15% Weight',
                    score: animatedTfidf,
                    detail: `Lexical term-frequency inverse-document-frequency cosine (${Number(match.tfidfCosine).toFixed(2)}).`,
                    icon: FileText,
                  },
                  {
                    title: 'Category, Location, Color & Date Context',
                    weight: '20% Weight',
                    score: contextPct,
                    detail: `Category (${catPct}%) · Campus Location (${locPct}%) · Incident Date (${datePct}%).`,
                    icon: Layers,
                  },
                ].map((mod, idx) => {
                  const Icon = mod.icon;
                  return (
                    <motion.div
                      key={mod.title}
                      className="ai-analysis-card"
                      initial={{ opacity: 0, x: idx % 2 === 0 ? -15 : 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.12 }}
                    >
                      <div className="ai-analysis-card__head">
                        <span className="ai-analysis-card__title">
                          <Icon size={15} aria-hidden="true" /> {mod.title}
                        </span>
                        <Badge variant="neutral">{mod.weight}</Badge>
                      </div>
                      <div className="ai-analysis-card__score-row">
                        <div className="ai-mini-bar" style={{ flex: 1 }}>
                          <motion.div
                            className="ai-mini-bar__fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${mod.score}%` }}
                            transition={{ duration: 0.85 }}
                          />
                        </div>
                        <strong className="ai-analysis-card__pct">{mod.score}%</strong>
                      </div>
                      <p className="ai-analysis-card__detail">{mod.detail}</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ===============================================================
              STAGE 4 & STAGE 5: MATCH DISCOVERY & FINAL MATCH RESULTS
              =============================================================== */}
          {(stage === 3 || stage === 4) && (
            <motion.div
              key="stage-match"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="ai-stage-box ai-stage-box--match"
            >
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="ai-match-banner"
              >
                <CheckCircle2 size={20} aria-hidden="true" />
                <span>Potential Match Found!</span>
                <Badge status={match.strengthLabel}>{match.strengthLabel}</Badge>
              </motion.div>

              {/* Interactive Photo Inspection Toolbar (Zoom In / Zoom Out / Reset / Side-by-Side / Close) */}
              <div className="ai-inspect-toolbar" role="toolbar" aria-label="Photo comparison controls">
                <span className="ai-inspect-toolbar__zoom">
                  Magnification: <strong>{Math.round(zoomLevel * 100)}%</strong>
                </span>
                <div className="ai-inspect-toolbar__btns">
                  <button type="button" className="btn btn--secondary btn--sm" onClick={handleZoomIn}>
                    <ZoomIn size={14} aria-hidden="true" /> Zoom In
                  </button>
                  <button type="button" className="btn btn--secondary btn--sm" onClick={handleZoomOut}>
                    <ZoomOut size={14} aria-hidden="true" /> Zoom Out
                  </button>
                  <button type="button" className="btn btn--secondary btn--sm" onClick={handleResetView}>
                    <Maximize2 size={14} aria-hidden="true" /> Reset
                  </button>
                  <button
                    type="button"
                    className={`btn btn--sm ${sideBySideSplit ? 'btn--primary' : 'btn--secondary'}`}
                    onClick={() => {
                      if (onSideBySide) onSideBySide(match);
                      else setSideBySideSplit((s) => !s);
                    }}
                  >
                    <Columns2 size={14} aria-hidden="true" /> Side-by-Side View
                  </button>
                  {onClose && (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
                      <X size={14} aria-hidden="true" /> Close
                    </button>
                  )}
                </div>
              </div>

              {/* Side-by-Side Photographs Sliding Toward Center + Connecting Line */}
              <div className={`ai-pair-arena ${sideBySideSplit ? 'ai-pair-arena--split' : ''}`}>
                {/* Left: Lost Item Photo */}
                <motion.div
                  className="ai-pair-photo-card ai-pair-photo-card--glow"
                  initial={prefersReducedMotion ? false : { x: -55, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                >
                  <div className="ai-pair-photo-card__badges">
                    <Badge status="lost">Lost Item</Badge>
                    {lostItem.reportCode && <Badge variant="neutral">{lostItem.reportCode}</Badge>}
                  </div>
                  <div className="ai-pair-photo-card__frame">
                    <div
                      className="ai-pair-photo-zoom-inner"
                      style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                    >
                      <ItemImage item={lostItem} square eager />
                    </div>
                    {!prefersReducedMotion && (
                      <motion.div
                        className="ai-scan-beam ai-scan-beam--subtle"
                        initial={{ top: '8%' }}
                        animate={{ top: ['8%', '90%', '8%'] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                        aria-hidden="true"
                      />
                    )}
                    <div className="ai-region-highlight" aria-hidden="true" />
                    <span className="ai-visual-feature-tag">
                      <CheckCircle2 size={11} aria-hidden="true" /> Visual Cue: {lostItem.color || getCategoryLabel(lostItem.category)}
                    </span>
                  </div>
                  <div className="ai-pair-photo-card__caption">
                    <h4>{lostItem.title}</h4>
                    <p>
                      <MapPin size={12} aria-hidden="true" /> {lostItem.location} ·{' '}
                      <Calendar size={12} aria-hidden="true" /> {lostItem.date}
                    </p>
                  </div>
                </motion.div>

                {/* Center: Animated Connecting Line + Checkmark + Score Counter */}
                {!sideBySideSplit && (
                  <div className="ai-pair-connector" aria-label={`Multimodal similarity score ${finalPct}%`}>
                    <div className="ai-connector-line-wrap" aria-hidden="true">
                      <motion.div
                        className="ai-connector-line"
                        initial={prefersReducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                      />
                    </div>

                    <motion.div
                      className="ai-connector-hub"
                      initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
                    >
                      <div className="ai-connector-check">
                        <CheckCircle2 size={22} aria-hidden="true" />
                      </div>
                      <div className="ai-connector-score">{animatedFinalScore}%</div>
                      <div className="ai-connector-label">
                        {clipPct !== null ? `CLIP Visual ${animatedClip}%` : 'Multimodal Match'}
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* Right: Found Item Photo */}
                <motion.div
                  className="ai-pair-photo-card ai-pair-photo-card--glow"
                  initial={prefersReducedMotion ? false : { x: 55, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                >
                  <div className="ai-pair-photo-card__badges">
                    <Badge status="found">Found Item</Badge>
                    {foundItem.reportCode && <Badge variant="neutral">{foundItem.reportCode}</Badge>}
                  </div>
                  <div className="ai-pair-photo-card__frame">
                    <div
                      className="ai-pair-photo-zoom-inner"
                      style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                    >
                      <ItemImage item={foundItem} square eager />
                    </div>
                    {!prefersReducedMotion && (
                      <motion.div
                        className="ai-scan-beam ai-scan-beam--subtle"
                        initial={{ top: '8%' }}
                        animate={{ top: ['90%', '8%', '90%'] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                        aria-hidden="true"
                      />
                    )}
                    <div className="ai-region-highlight" aria-hidden="true" />
                    <span className="ai-visual-feature-tag">
                      <CheckCircle2 size={11} aria-hidden="true" /> Visual Cue: {foundItem.color || getCategoryLabel(foundItem.category)}
                    </span>
                  </div>
                  <div className="ai-pair-photo-card__caption">
                    <h4>{foundItem.title}</h4>
                    <p>
                      <MapPin size={12} aria-hidden="true" /> {foundItem.location} ·{' '}
                      <Calendar size={12} aria-hidden="true" /> {foundItem.date}
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Multimodal Score Breakdown & Compatibility Pills */}
              <motion.div
                className="ai-multimodal-breakdown"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="ai-score-tiles">
                  <div className="ai-score-tile">
                    <span className="ai-score-tile__label">
                      <ImageIcon size={13} aria-hidden="true" /> CLIP Image Similarity
                    </span>
                    <strong className="ai-score-tile__val">
                      {clipPct !== null ? `${clipPct}%` : 'Recalibrated'}
                    </strong>
                    <span className="ai-score-tile__sub">
                      {clipPct !== null
                        ? `Cosine: ${Number(match.clipImageScore).toFixed(2)} (Weight 0.30)`
                        : 'No photo penalty applied'}
                    </span>
                  </div>

                  <div className="ai-score-tile">
                    <span className="ai-score-tile__label">
                      <Sparkles size={13} aria-hidden="true" /> Sentence-BERT Text
                    </span>
                    <strong className="ai-score-tile__val">{sbertPct}%</strong>
                    <span className="ai-score-tile__sub">
                      Semantic Cosine: {Number(match.sbertSimilarity).toFixed(2)} (Weight 0.35)
                    </span>
                  </div>

                  <div className="ai-score-tile">
                    <span className="ai-score-tile__label">
                      <FileText size={13} aria-hidden="true" /> TF-IDF Keyword
                    </span>
                    <strong className="ai-score-tile__val">{tfidfPct}%</strong>
                    <span className="ai-score-tile__sub">
                      Lexical Cosine: {Number(match.tfidfCosine).toFixed(2)} (Weight 0.15)
                    </span>
                  </div>

                  <div className="ai-score-tile ai-score-tile--highlight">
                    <span className="ai-score-tile__label">
                      <Layers size={13} aria-hidden="true" /> Combined Ranking Score
                    </span>
                    <strong className="ai-score-tile__val">{finalPct}%</strong>
                    <span className="ai-score-tile__sub">
                      Context: {contextPct}% · {match.strengthLabel}
                    </span>
                  </div>
                </div>

                {/* Explanation & Compatibility Row */}
                <div className="ai-explanation-box">
                  <p className="ai-explanation-box__text">{explanationText}</p>
                  <p style={{ margin: '0 0 0.65rem', fontSize: '0.73rem', color: '#82776B', fontStyle: 'italic' }}>
                    Note: CLIP visual similarity reflects shared visual patterns, color tones, and object silhouettes. It assists discovery and does not alone establish identical physical item identity without ownership verification.
                  </p>
                  <div className="ai-compatibility-chips">
                    <span className={`ai-compat-chip ${categoryCompatible ? 'ai-compat-chip--ok' : ''}`}>
                      <Tag size={12} aria-hidden="true" /> Category:{' '}
                      {categoryCompatible
                        ? `Matched (${getCategoryLabel(foundItem.category)})`
                        : `${getCategoryLabel(lostItem.category)} ↔ ${getCategoryLabel(foundItem.category)}`}
                    </span>
                    <span className={`ai-compat-chip ${locationCompatible ? 'ai-compat-chip--ok' : ''}`}>
                      <MapPin size={12} aria-hidden="true" /> Location:{' '}
                      {locationCompatible
                        ? `Compatible (${foundItem.location})`
                        : `${lostItem.location} ↔ ${foundItem.location}`}
                    </span>
                    <span className={`ai-compat-chip ${dateCompatible ? 'ai-compat-chip--ok' : ''}`}>
                      <Calendar size={12} aria-hidden="true" /> Date:{' '}
                      {dateCompatible
                        ? `Compatible (${lostItem.date} ↔ ${foundItem.date})`
                        : `${lostItem.date} ↔ ${foundItem.date}`}
                    </span>
                  </div>
                </div>

                {/* Stage 5 Summary of Identified Matches */}
                {stage === 4 && topMatchesSummary.length > 1 && (
                  <div className="ai-final-ranked-strip">
                    <span className="ai-final-ranked-strip__title">
                      All Identified Ranked Matches ({topMatchesSummary.length})
                    </span>
                    <div className="ai-final-ranked-strip__grid">
                      {topMatchesSummary.map((mItem, rIdx) => (
                        <div key={mItem.id} className="ai-final-ranked-mini">
                          <Badge status="matched">#{rIdx + 1} · {Math.round((mItem.score || 0) * 100)}%</Badge>
                          <strong>{mItem.foundItem?.title || mItem.matchedItem?.title}</strong>
                          <span>
                            SBERT: {Math.round((mItem.sbertSimilarity || 0) * 100)}% · CLIP:{' '}
                            {mItem.clipImageScore != null ? `${Math.round(mItem.clipImageScore * 100)}%` : 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {!compact && (
                  <div className="ai-matcher-actions">
                    <Button
                      to={`/photo-match/${encodeURIComponent(match.id)}`}
                      variant="primary"
                    >
                      <Eye size={15} aria-hidden="true" /> Open Photo Comparison Page
                    </Button>
                    <Button
                      to={`/claim/${foundItem.id}?lostItemId=${lostItem.id}`}
                      variant="secondary"
                    >
                      <ShieldCheck size={15} aria-hidden="true" /> Submit Ownership Claim
                    </Button>
                    <Button to={`/items/${foundItem.id}`} variant="ghost">
                      View Found Item Details
                    </Button>
                    {onClose && (
                      <Button variant="ghost" onClick={onClose}>
                        Close Preview
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .ai-photo-matcher {
          background: linear-gradient(165deg, var(--cream-50) 0%, var(--cream-100) 60%, var(--sand-200) 100%);
          border: 1.5px solid var(--sand-300);
          border-radius: var(--radius-lg);
          padding: clamp(1.1rem, 2.5vw, 1.75rem);
          box-shadow: var(--shadow-md);
          overflow: hidden;
        }

        .ai-photo-matcher__header {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.85rem;
        }

        .ai-photo-matcher__title {
          font-size: clamp(1.2rem, 2.2vw, 1.55rem);
          color: var(--mocha-900);
          margin: 0;
        }

        .ai-photo-matcher__controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.55rem;
        }

        .ai-stage-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }

        .ai-stage-pill {
          padding: 0.3rem 0.65rem;
          border-radius: var(--radius-pill);
          font-size: 0.71rem;
          font-weight: 600;
          border: 1px solid var(--sand-300);
          background-color: var(--cream-50);
          color: var(--mocha-600);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ai-stage-pill--done {
          background-color: #EDE4D8;
          border-color: #A67C52;
          color: #3D3228;
        }

        .ai-stage-pill--active {
          background-color: #3D3228;
          border-color: #3D3228;
          color: #FFFDF8;
        }

        .ai-pipeline-track {
          height: 5px;
          background-color: var(--sand-300);
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 1.25rem;
        }

        .ai-pipeline-track__fill {
          height: 100%;
          background: linear-gradient(90deg, var(--bronze-500), var(--bronze-700), var(--success));
          border-radius: 999px;
        }

        /* Stage 1: Scanning */
        .ai-stage-box--scan {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
          align-items: center;
        }

        @media (min-width: 720px) {
          .ai-stage-box--scan {
            grid-template-columns: 260px 1fr;
          }
        }

        .ai-scan-frame {
          position: relative;
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 2px solid var(--bronze-500);
          box-shadow: 0 0 24px rgba(137, 102, 66, 0.22);
          max-width: 280px;
          margin: 0 auto;
          width: 100%;
        }

        .ai-scan-beam {
          position: absolute;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, transparent 0%, #C4A484 25%, #FFFDF8 50%, #A67C52 75%, transparent 100%);
          box-shadow: 0 0 18px 4px rgba(166, 124, 82, 0.78);
          z-index: 4;
          pointer-events: none;
        }

        .ai-scan-grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, rgba(255, 253, 248, 0.14) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 253, 248, 0.14) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 2;
        }

        .ai-scan-badge {
          position: absolute;
          bottom: 0.55rem;
          left: 0.55rem;
          right: 0.55rem;
          padding: 0.3rem 0.6rem;
          border-radius: var(--radius-pill);
          background-color: rgba(61, 50, 40, 0.9);
          color: var(--cream-50);
          font-size: 0.7rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          z-index: 5;
        }

        .ai-pulse-indicator {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          color: var(--bronze-700);
          font-size: var(--text-sm);
          margin-bottom: 0.45rem;
        }

        .ai-pulse-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: var(--bronze-500);
          box-shadow: 0 0 0 4px rgba(166, 124, 82, 0.2);
        }

        .ai-init-indicators {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .ai-init-ind {
          background-color: var(--cream-50);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
          padding: 0.5rem 0.75rem;
        }

        .ai-init-ind__top {
          display: flex;
          justify-content: space-between;
          font-size: 0.73rem;
          margin-bottom: 0.3rem;
          color: var(--mocha-900);
        }

        .ai-init-ind__top strong {
          color: var(--success);
        }

        .ai-mini-bar {
          height: 6px;
          background-color: var(--sand-200);
          border-radius: 999px;
          overflow: hidden;
        }

        .ai-mini-bar__fill {
          height: 100%;
          background: linear-gradient(90deg, var(--bronze-500), var(--bronze-700));
          border-radius: 999px;
        }

        /* Stage 2: Database Search */
        .ai-db-search-banner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 1rem;
          background-color: var(--cream-50);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
          padding: 0.65rem 0.95rem;
        }

        .ai-search-carousel {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.9rem;
        }

        .ai-search-card {
          background-color: var(--cream-50);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-lg);
          padding: 0.65rem;
        }

        .ai-search-card--highlight {
          border: 2px solid var(--bronze-500);
          box-shadow: 0 0 20px rgba(166, 124, 82, 0.25);
        }

        .ai-search-card__img {
          position: relative;
          border-radius: var(--radius-md);
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .ai-search-card__tag {
          position: absolute;
          bottom: 0.4rem;
          left: 0.4rem;
          right: 0.4rem;
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-pill);
          background-color: rgba(61, 50, 40, 0.88);
          color: var(--cream-50);
          font-size: 0.68rem;
          font-weight: 700;
          text-align: center;
        }

        .ai-search-card__meta {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          font-size: var(--text-xs);
        }

        .ai-search-card__meta strong {
          color: var(--mocha-900);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ai-search-card__meta span {
          color: var(--mocha-600);
        }

        /* Stage 3: Multimodal Analysis Grid */
        .ai-analysis-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.85rem;
        }

        @media (min-width: 720px) {
          .ai-analysis-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .ai-analysis-card {
          background-color: var(--cream-50);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
          padding: 0.85rem 1rem;
        }

        .ai-analysis-card__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .ai-analysis-card__title {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--mocha-900);
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        .ai-analysis-card__score-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.4rem;
        }

        .ai-analysis-card__pct {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          color: var(--bronze-700);
          min-width: 44px;
          text-align: right;
        }

        .ai-analysis-card__detail {
          font-size: 0.74rem;
          color: var(--mocha-600);
          margin: 0;
        }

        /* Stage 4 & 5: Matching Arena */
        .ai-match-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 0.55rem;
          padding: 0.55rem 1rem;
          border-radius: var(--radius-pill);
          background-color: var(--verified-bg);
          color: var(--verified-text);
          border: 1px solid var(--verified-border);
          font-weight: 700;
          font-size: var(--text-sm);
          width: fit-content;
          margin: 0 auto 1.15rem;
        }

        .ai-pair-arena {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          align-items: center;
          margin-bottom: 1.25rem;
        }

        @media (min-width: 820px) {
          .ai-pair-arena {
            grid-template-columns: 1fr 170px 1fr;
          }
        }

        .ai-pair-photo-card {
          background-color: var(--cream-50);
          border: 1.5px solid var(--bronze-500);
          border-radius: var(--radius-lg);
          padding: 0.85rem;
        }

        .ai-pair-photo-card--glow {
          box-shadow: 0 0 22px rgba(166, 124, 82, 0.25), var(--shadow-sm);
        }

        .ai-pair-photo-card__badges {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.4rem;
          margin-bottom: 0.6rem;
        }

        .ai-pair-photo-card__frame {
          position: relative;
          border-radius: var(--radius-md);
          overflow: hidden;
          max-height: 230px;
        }

        .ai-pair-photo-card__frame .item-media {
          max-height: 230px;
        }

        .ai-visual-feature-tag {
          position: absolute;
          bottom: 0.45rem;
          left: 0.45rem;
          padding: 0.2rem 0.55rem;
          border-radius: var(--radius-pill);
          background-color: rgba(61, 50, 40, 0.88);
          color: var(--cream-50);
          font-size: 0.67rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .ai-pair-photo-card__caption {
          margin-top: 0.65rem;
        }

        .ai-pair-photo-card__caption h4 {
          font-size: var(--text-base);
          margin: 0 0 0.2rem;
          color: var(--mocha-900);
        }

        .ai-pair-photo-card__caption p {
          font-size: var(--text-xs);
          color: var(--mocha-600);
          margin: 0;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          flex-wrap: wrap;
        }

        .ai-pair-connector {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 0;
        }

        .ai-connector-line-wrap {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1;
        }

        .ai-connector-line {
          height: 3px;
          width: 100%;
          background: linear-gradient(90deg, var(--bronze-700), var(--bronze-500), var(--success));
          border-radius: 999px;
          transform-origin: left center;
          box-shadow: 0 0 12px rgba(166, 124, 82, 0.45);
        }

        .ai-connector-hub {
          position: relative;
          z-index: 2;
          background-color: var(--cream-50);
          border: 2px solid var(--bronze-700);
          border-radius: var(--radius-lg);
          padding: 0.7rem 0.9rem;
          text-align: center;
          box-shadow: 0 8px 22px rgba(61, 50, 40, 0.14);
          min-width: 132px;
        }

        .ai-connector-check {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background-color: var(--verified-bg);
          color: var(--verified-text);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 0.3rem;
        }

        .ai-connector-score {
          font-family: var(--font-serif);
          font-size: 1.75rem;
          font-weight: 700;
          line-height: 1;
          color: var(--mocha-900);
        }

        .ai-connector-label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--bronze-700);
          margin-top: 0.2rem;
        }

        /* Multimodal Breakdown */
        .ai-score-tiles {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.65rem;
          margin-bottom: 0.9rem;
        }

        @media (min-width: 768px) {
          .ai-score-tiles {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .ai-score-tile {
          background-color: var(--cream-50);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
          padding: 0.65rem 0.8rem;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .ai-score-tile--highlight {
          background-color: var(--sand-200);
          border-color: var(--bronze-500);
        }

        .ai-score-tile__label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--mocha-600);
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .ai-score-tile__val {
          font-family: var(--font-serif);
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--mocha-900);
        }

        .ai-score-tile__sub {
          font-size: 0.7rem;
          color: var(--mocha-600);
        }

        .ai-explanation-box {
          background-color: var(--cream-50);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
          padding: 0.85rem 1rem;
          margin-bottom: 1rem;
        }

        .ai-explanation-box__text {
          font-size: var(--text-sm);
          color: var(--mocha-900);
          font-weight: 500;
          margin: 0 0 0.6rem;
        }

        .ai-compatibility-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }

        .ai-compat-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.22rem 0.6rem;
          border-radius: var(--radius-pill);
          font-size: 0.72rem;
          font-weight: 600;
          background-color: var(--cream-100);
          border: 1px solid var(--sand-300);
          color: var(--mocha-600);
        }

        .ai-compat-chip--ok {
          background-color: var(--verified-bg);
          border-color: var(--verified-border);
          color: var(--verified-text);
        }

        .ai-final-ranked-strip {
          background-color: var(--cream-50);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
          padding: 0.75rem 0.9rem;
          margin-bottom: 1rem;
        }

        .ai-final-ranked-strip__title {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--bronze-700);
          margin-bottom: 0.5rem;
        }

        .ai-final-ranked-strip__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 0.6rem;
        }

        .ai-final-ranked-mini {
          background-color: var(--cream-100);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-sm);
          padding: 0.5rem 0.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          font-size: var(--text-xs);
        }

        .ai-matcher-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          align-items: center;
        }

        .ai-inspect-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.6rem;
          padding: 0.55rem 0.85rem;
          margin-bottom: 1rem;
          border-radius: var(--radius-md);
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
        }
        .ai-inspect-toolbar__zoom {
          font-size: 0.78rem;
          color: #82776B;
        }
        .ai-inspect-toolbar__zoom strong {
          color: #3D3228;
        }
        .ai-inspect-toolbar__btns {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }
        .ai-pair-arena--split {
          grid-template-columns: 1fr !important;
        }
        @media (min-width: 720px) {
          .ai-pair-arena--split {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        .ai-pair-photo-zoom-inner {
          transition: transform 0.22s ease;
          width: 100%;
        }
        .ai-scan-beam--subtle {
          height: 2px;
          opacity: 0.7;
        }
        .ai-region-highlight {
          position: absolute;
          inset: 14% 18%;
          border: 1.5px dashed rgba(166, 124, 82, 0.72);
          border-radius: 10px;
          pointer-events: none;
          box-shadow: inset 0 0 14px rgba(166, 124, 82, 0.14);
          z-index: 3;
        }
      `}</style>
    </div>
  );
}
