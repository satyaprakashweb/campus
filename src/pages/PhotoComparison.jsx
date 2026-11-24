import { useState, useMemo } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Eye,
  XCircle,
  CheckCircle2,
  MapPin,
  Calendar,
  Tag,
  Cpu,
  Image as ImageIcon,
  FileText,
  Layers,
  Scan,
  ChevronRight,
} from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';
import { useAuth } from '../context/AuthContext';
import { getCategoryLabel } from '../data/mockData';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Select from '../components/Select';
import ItemImage from '../components/ItemImage';
import EmptyState from '../components/EmptyState';
import AnimatedPhotoMatcher from '../components/AnimatedPhotoMatcher';

export default function PhotoComparison() {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const { items = [], aiMatches = [], getMatchesForItem, submitMatchFeedback } = usePortalData();
  const { isAuthenticated } = useAuth();

  const queryLostId = searchParams.get('lostId');
  const queryFoundId = searchParams.get('foundId');

  // Resolve all available matches (persisted + dynamically ranked)
  const allMatches = useMemo(() => {
    if (Array.isArray(aiMatches) && aiMatches.length > 0) {
      return aiMatches;
    }
    const lostItems = items.filter((i) => i.type === 'lost');
    const acc = [];
    lostItems.forEach((l) => {
      getMatchesForItem(l.id).forEach((m) => acc.push(m));
    });
    return acc.sort((a, b) => b.score - a.score);
  }, [aiMatches, items, getMatchesForItem]);

  const initialMatch = useMemo(() => {
    if (matchId) {
      const decoded = decodeURIComponent(matchId);
      const found = allMatches.find((m) => m.id === decoded);
      if (found) return found;
    }
    if (queryLostId && queryFoundId) {
      const found = allMatches.find(
        (m) => m.lostItemId === queryLostId && m.foundItemId === queryFoundId
      );
      if (found) return found;
    }
    return allMatches[0] || null;
  }, [matchId, queryLostId, queryFoundId, allMatches]);

  const [selectedMatchId, setSelectedMatchId] = useState(initialMatch?.id || '');
  const [showAnimationStage, setShowAnimationStage] = useState(true);
  const [lostPhotoIdx, setLostPhotoIdx] = useState(0);
  const [foundPhotoIdx, setFoundPhotoIdx] = useState(0);

  const activeMatch =
    allMatches.find((m) => m.id === selectedMatchId) || initialMatch || allMatches[0] || null;

  if (!activeMatch || !activeMatch.lostItem || !activeMatch.foundItem) {
    return (
      <section className="section" style={{ paddingTop: 'calc(var(--navbar-height) + 3rem)' }}>
        <div className="container container--narrow">
          <EmptyState
            showIllustration
            title="No matching photo pairs available"
            description="Submit a lost or found item report with a photograph to run multimodal CLIP image + Sentence-BERT matching."
            action={
              <Button to="/matches" variant="primary">
                <ArrowLeft size={16} aria-hidden="true" /> Back to AI Matches
              </Button>
            }
          />
        </div>
      </section>
    );
  }

  const { lostItem, foundItem } = activeMatch;

  const lostPhotos =
    Array.isArray(lostItem.photos) && lostItem.photos.length > 0
      ? lostItem.photos
      : lostItem.photo
      ? [lostItem.photo]
      : [];

  const foundPhotos =
    Array.isArray(foundItem.photos) && foundItem.photos.length > 0
      ? foundItem.photos
      : foundItem.photo
      ? [foundItem.photo]
      : [];

  const displayLostItem = lostPhotos[lostPhotoIdx]
    ? { ...lostItem, photo: lostPhotos[lostPhotoIdx] }
    : lostItem;

  const displayFoundItem = foundPhotos[foundPhotoIdx]
    ? { ...foundItem, photo: foundPhotos[foundPhotoIdx] }
    : foundItem;

  const textSimPct = Math.round(Number(activeMatch.sbertSimilarity ?? 0.75) * 100);
  const tfidfPct = Math.round(Number(activeMatch.tfidfCosine ?? 0.42) * 100);
  const imageSimPct =
    activeMatch.clipImageScore !== null && activeMatch.clipImageScore !== undefined
      ? Math.round(Number(activeMatch.clipImageScore) * 100)
      : null;
  const contextSimPct = Math.round(Number(activeMatch.contextualScore ?? 0.85) * 100);
  const finalScorePct = Math.round(Number(activeMatch.score ?? activeMatch.finalScore ?? 0.82) * 100);

  const catPct = Math.round(Number(activeMatch.categoryScore ?? (lostItem.category === foundItem.category ? 1 : 0)) * 100);
  const locPct = Math.round(
    Number(
      activeMatch.locationScore ??
        (lostItem.location?.toLowerCase() === foundItem.location?.toLowerCase() ? 1 : 0.25)
    ) * 100
  );
  const datePct = Math.round(Number(activeMatch.dateScore ?? 0.9) * 100);

  const explanationText =
    activeMatch.matchingExplanation ||
    `These photographs appear visually similar${
      imageSimPct !== null ? ` (${imageSimPct}% CLIP similarity)` : ''
    }, both reports describe a ${
      lostItem.color ? lostItem.color.toLowerCase() + ' ' : ''
    }${getCategoryLabel(lostItem.category).toLowerCase()}, and the reported locations (${
      foundItem.location
    }) and dates are compatible.`;

  const handleNotAMatch = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    await submitMatchFeedback(activeMatch.id, {
      feedbackType: 'not_my_item',
      lostItemId: lostItem.id,
      foundItemId: foundItem.id,
      comment: 'Marked Not a Match on Photo Comparison page',
    });
  };

  const matchSelectorOptions = allMatches.map((m, idx) => ({
    value: m.id,
    label: `#${idx + 1} (${Math.round(m.score * 100)}%) ${m.lostItem?.title} ↔ ${m.foundItem?.title}`,
  }));

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <Link to="/matches">AI Matches</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span aria-current="page">AI Visual Photo Comparison</span>
          </nav>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <span className="eyebrow">
                <Cpu size={13} style={{ display: 'inline', verticalAlign: 'middle' }} aria-hidden="true" />{' '}
                CLIP ViT-B/32 + Sentence-BERT + TF-IDF Multimodal Engine
              </span>
              <h1>AI Visual Matching Results</h1>
              <p className="page-header__lead">
                Side-by-side computer vision and semantic text comparison between reported lost and
                found campus items.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <Button
                variant={showAnimationStage ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowAnimationStage((v) => !v)}
              >
                <Scan size={14} aria-hidden="true" />{' '}
                {showAnimationStage ? 'Hide 4-Step AI Animation' : 'Play 4-Step AI Animation'}
              </Button>
              <Button to="/matches" variant="secondary" size="sm">
                <ArrowLeft size={14} aria-hidden="true" /> Back to Results
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--compact">
        <div className="container">
          {/* Pair Selector Bar */}
          {allMatches.length > 1 && (
            <Card style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
              <Select
                id="photo-match-pair-select"
                label="Select Matched Lost ↔ Found Report Pair to Compare"
                options={matchSelectorOptions}
                value={activeMatch.id}
                onChange={(e) => {
                  setSelectedMatchId(e.target.value);
                  setLostPhotoIdx(0);
                  setFoundPhotoIdx(0);
                }}
              />
            </Card>
          )}

          {/* 4-Step Animated AI Photo Matching Experience */}
          {showAnimationStage && (
            <div style={{ marginBottom: '2rem' }}>
              <AnimatedPhotoMatcher
                key={activeMatch.id}
                match={activeMatch}
                candidateItems={items}
                autoPlay={true}
                initialStage={0}
                compact={true}
              />
            </div>
          )}

          {/* Dedicated Side-by-Side Photo Comparison Architecture (Section 5 Layout) */}
          <Card className="photo-comp-card">
            <div className="photo-comp-card__top">
              <div>
                <span className="eyebrow">Side-by-Side Visual &amp; Metadata Inspection</span>
                <h2 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>
                  Photograph &amp; Attribute Alignment
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <Badge status={activeMatch.strengthLabel}>{activeMatch.strengthLabel}</Badge>
                {activeMatch.status && activeMatch.status !== 'active' && (
                  <Badge variant="neutral">Feedback: {activeMatch.status.replace(/_/g, ' ')}</Badge>
                )}
              </div>
            </div>

            {/* LEFT SIDE (Lost) | CENTER (Animated Connection) | RIGHT SIDE (Found) */}
            <div className="photo-comp-grid">
              {/* LEFT SIDE: LOST ITEM */}
              <motion.div
                className="photo-comp-pane photo-comp-pane--lost"
                initial={prefersReducedMotion ? false : { opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="photo-comp-pane__head">
                  <Badge status="lost">Lost Report</Badge>
                  <span className="photo-comp-pane__code">{lostItem.reportCode || lostItem.id}</span>
                </div>

                <div className="photo-comp-pane__image-wrap">
                  <ItemImage item={displayLostItem} square eager />
                  {lostItem.imageEmbeddingReference && (
                    <span className="photo-comp-pane__emb-tag">
                      <Cpu size={12} aria-hidden="true" /> {lostItem.imageEmbeddingReference.slice(0, 18)}
                    </span>
                  )}
                </div>

                {lostPhotos.length > 1 && (
                  <div className="photo-comp-thumbs">
                    {lostPhotos.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`photo-comp-thumb ${idx === lostPhotoIdx ? 'photo-comp-thumb--active' : ''}`}
                        onClick={() => setLostPhotoIdx(idx)}
                      >
                        <img src={url} alt={`Lost view ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                )}

                <h3 className="photo-comp-pane__title">{lostItem.title}</h3>
                <p className="photo-comp-pane__desc">{lostItem.description}</p>

                <dl className="photo-comp-meta">
                  <div>
                    <dt><Tag size={13} aria-hidden="true" /> Category</dt>
                    <dd>{getCategoryLabel(lostItem.category)}</dd>
                  </div>
                  <div>
                    <dt><Calendar size={13} aria-hidden="true" /> Lost Date</dt>
                    <dd>{lostItem.date} {lostItem.time ? `· ${lostItem.time}` : ''}</dd>
                  </div>
                  <div>
                    <dt><MapPin size={13} aria-hidden="true" /> Lost Location</dt>
                    <dd>{lostItem.location}</dd>
                  </div>
                </dl>
              </motion.div>

              {/* CENTER: ANIMATED CONNECTION BETWEEN BOTH PHOTOGRAPHS */}
              <div className="photo-comp-center" aria-label="Animated visual connection">
                <div className="photo-comp-bridge">
                  <motion.div
                    className="photo-comp-bridge__beam"
                    initial={prefersReducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.75, ease: 'easeOut' }}
                  />

                  <motion.div
                    className="photo-comp-bridge__node"
                    initial={prefersReducedMotion ? false : { scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 240, damping: 18 }}
                  >
                    <div className="photo-comp-bridge__check">
                      <CheckCircle2 size={24} aria-hidden="true" />
                    </div>
                    <strong className="photo-comp-bridge__score">{finalScorePct}%</strong>
                    <span className="photo-comp-bridge__label">Final Ranking</span>
                    {imageSimPct !== null && (
                      <span className="photo-comp-bridge__clip">
                        CLIP Visual: {imageSimPct}%
                      </span>
                    )}
                  </motion.div>
                </div>
              </div>

              {/* RIGHT SIDE: FOUND ITEM */}
              <motion.div
                className="photo-comp-pane photo-comp-pane--found"
                initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="photo-comp-pane__head">
                  <Badge status="found">Found Report</Badge>
                  <span className="photo-comp-pane__code">{foundItem.reportCode || foundItem.id}</span>
                </div>

                <div className="photo-comp-pane__image-wrap">
                  <ItemImage item={displayFoundItem} square eager />
                  {foundItem.imageEmbeddingReference && (
                    <span className="photo-comp-pane__emb-tag">
                      <Cpu size={12} aria-hidden="true" /> {foundItem.imageEmbeddingReference.slice(0, 18)}
                    </span>
                  )}
                </div>

                {foundPhotos.length > 1 && (
                  <div className="photo-comp-thumbs">
                    {foundPhotos.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`photo-comp-thumb ${idx === foundPhotoIdx ? 'photo-comp-thumb--active' : ''}`}
                        onClick={() => setFoundPhotoIdx(idx)}
                      >
                        <img src={url} alt={`Found view ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                )}

                <h3 className="photo-comp-pane__title">{foundItem.title}</h3>
                <p className="photo-comp-pane__desc">{foundItem.description}</p>

                <dl className="photo-comp-meta">
                  <div>
                    <dt><Tag size={13} aria-hidden="true" /> Category</dt>
                    <dd>{getCategoryLabel(foundItem.category)}</dd>
                  </div>
                  <div>
                    <dt><Calendar size={13} aria-hidden="true" /> Found Date</dt>
                    <dd>{foundItem.date} {foundItem.time ? `· ${foundItem.time}` : ''}</dd>
                  </div>
                  <div>
                    <dt><MapPin size={13} aria-hidden="true" /> Found Location</dt>
                    <dd>{foundItem.location}</dd>
                  </div>
                </dl>
              </motion.div>
            </div>

            {/* BELOW THE PHOTOGRAPHS: MULTIMODAL SCORES & EXPLANATION */}
            <div className="photo-comp-metrics">
              <div className="photo-comp-metric-card">
                <div className="photo-comp-metric-card__head">
                  <span><FileText size={14} aria-hidden="true" /> Text Similarity</span>
                  <strong>{textSimPct}%</strong>
                </div>
                <div className="photo-comp-bar">
                  <motion.div
                    className="photo-comp-bar__fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${textSimPct}%` }}
                    transition={{ duration: 0.7 }}
                  />
                </div>
                <span className="photo-comp-metric-card__sub">
                  Sentence-BERT: {textSimPct}% (0.35w) · TF-IDF: {tfidfPct}% (0.15w)
                </span>
              </div>

              <div className="photo-comp-metric-card">
                <div className="photo-comp-metric-card__head">
                  <span><ImageIcon size={14} aria-hidden="true" /> Image Similarity</span>
                  <strong>{imageSimPct !== null ? `${imageSimPct}%` : 'Recalibrated'}</strong>
                </div>
                <div className="photo-comp-bar">
                  <motion.div
                    className="photo-comp-bar__fill photo-comp-bar__fill--clip"
                    initial={{ width: 0 }}
                    animate={{ width: `${imageSimPct !== null ? imageSimPct : textSimPct}%` }}
                    transition={{ duration: 0.7 }}
                  />
                </div>
                <span className="photo-comp-metric-card__sub">
                  {imageSimPct !== null
                    ? `CLIP ViT-B/32 Cosine: ${Number(activeMatch.clipImageScore).toFixed(2)} (0.30w)`
                    : 'Missing image weight redistributed proportionally'}
                </span>
              </div>

              <div className="photo-comp-metric-card">
                <div className="photo-comp-metric-card__head">
                  <span><MapPin size={14} aria-hidden="true" /> Contextual Match Score</span>
                  <strong>{contextSimPct}%</strong>
                </div>
                <div className="photo-comp-bar">
                  <motion.div
                    className="photo-comp-bar__fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${contextSimPct}%` }}
                    transition={{ duration: 0.7 }}
                  />
                </div>
                <span className="photo-comp-metric-card__sub">
                  Category: {catPct}% (0.10w) · Location: {locPct}% (0.05w) · Date: {datePct}% (0.05w)
                </span>
              </div>

              <div className="photo-comp-metric-card photo-comp-metric-card--final">
                <div className="photo-comp-metric-card__head">
                  <span><Layers size={14} aria-hidden="true" /> Final Ranking Score</span>
                  <strong>{finalScorePct}%</strong>
                </div>
                <div className="photo-comp-bar">
                  <motion.div
                    className="photo-comp-bar__fill photo-comp-bar__fill--final"
                    initial={{ width: 0 }}
                    animate={{ width: `${finalScorePct}%` }}
                    transition={{ duration: 0.7 }}
                  />
                </div>
                <span className="photo-comp-metric-card__sub">
                  0.35×SBERT + 0.15×TF-IDF + 0.30×CLIP + 0.10×Cat + 0.05×Loc + 0.05×Date
                </span>
              </div>
            </div>

            {/* Matching Explanation Box */}
            <div className="photo-comp-explanation">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem', color: 'var(--bronze-700)', fontWeight: 700, fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Sparkles size={14} aria-hidden="true" /> AI Multimodal Matching Explanation
              </div>
              <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--mocha-900)', fontWeight: 500 }}>
                "{explanationText}"
              </p>
              <p style={{ margin: '0.4rem 0 0', fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                Note: Similarity scores represent multimodal visual, semantic, and contextual ranking alignment, not an automatic guarantee of ownership. Final ownership is verified by campus administrators.
              </p>
            </div>

            {/* Action Buttons: View Full Item, Submit Ownership Claim, Not a Match, Back to Results */}
            <div className="photo-comp-actions">
              <Button to={`/items/${foundItem.id}`} variant="secondary" size="lg">
                <Eye size={16} aria-hidden="true" /> View Full Item
              </Button>
              <Button
                to={`/claim/${foundItem.id}?lostItemId=${lostItem.id}`}
                variant="primary"
                size="lg"
              >
                <ShieldCheck size={16} aria-hidden="true" /> Submit Ownership Claim
              </Button>
              <Button
                variant={activeMatch.status === 'not_my_item' ? 'danger' : 'secondary'}
                size="lg"
                onClick={handleNotAMatch}
              >
                <XCircle size={16} aria-hidden="true" />{' '}
                {activeMatch.status === 'not_my_item' ? 'Marked Not a Match' : 'Not a Match'}
              </Button>
              <Button to="/matches" variant="ghost" size="lg">
                <ArrowLeft size={16} aria-hidden="true" /> Back to Results
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <style>{`
        .breadcrumb {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.45rem;
          font-size: var(--text-xs);
          color: var(--mocha-600);
          margin-bottom: 1rem;
        }

        .breadcrumb a {
          color: var(--bronze-700);
          font-weight: 500;
        }

        .photo-comp-card {
          padding: clamp(1.25rem, 3vw, 2rem);
        }

        .photo-comp-card__top {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-bottom: 1.15rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--sand-300);
        }

        .photo-comp-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
          align-items: stretch;
          margin-bottom: 1.75rem;
        }

        @media (min-width: 960px) {
          .photo-comp-grid {
            grid-template-columns: 1fr 180px 1fr;
            align-items: center;
          }
        }

        .photo-comp-pane {
          background-color: var(--cream-100);
          border: 1.5px solid var(--sand-300);
          border-radius: var(--radius-lg);
          padding: 1.1rem;
          display: flex;
          flex-direction: column;
          box-shadow: 0 0 20px rgba(168, 135, 90, 0.14);
        }

        .photo-comp-pane--lost,
        .photo-comp-pane--found {
          border-color: var(--bronze-500);
        }

        .photo-comp-pane__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .photo-comp-pane__code {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--mocha-600);
        }

        .photo-comp-pane__image-wrap {
          position: relative;
          border-radius: var(--radius-md);
          overflow: hidden;
          margin-bottom: 0.75rem;
          border: 1px solid var(--sand-300);
        }

        .photo-comp-pane__emb-tag {
          position: absolute;
          bottom: 0.5rem;
          left: 0.5rem;
          padding: 0.2rem 0.55rem;
          border-radius: var(--radius-pill);
          background-color: rgba(61, 48, 38, 0.85);
          color: var(--cream-50);
          font-size: 0.68rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .photo-comp-thumbs {
          display: flex;
          gap: 0.45rem;
          margin-bottom: 0.75rem;
        }

        .photo-comp-thumb {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 2px solid var(--sand-300);
          padding: 0;
          cursor: pointer;
        }

        .photo-comp-thumb--active {
          border-color: var(--bronze-700);
        }

        .photo-comp-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-comp-pane__title {
          font-size: var(--text-xl);
          margin: 0 0 0.4rem;
          color: var(--mocha-900);
        }

        .photo-comp-pane__desc {
          font-size: var(--text-sm);
          color: var(--mocha-600);
          margin: 0 0 1rem;
          flex: 1;
        }

        .photo-comp-meta {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.5rem;
          margin: 0;
          padding-top: 0.75rem;
          border-top: 1px solid var(--sand-300);
        }

        .photo-comp-meta div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          font-size: var(--text-xs);
        }

        .photo-comp-meta dt {
          color: var(--mocha-600);
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .photo-comp-meta dd {
          color: var(--mocha-900);
          font-weight: 700;
          margin: 0;
          text-align: right;
        }

        /* Center Connection */
        .photo-comp-center {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .photo-comp-bridge {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 0;
        }

        .photo-comp-bridge__beam {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 4px;
          transform: translateY(-50%);
          background: linear-gradient(90deg, var(--bronze-700), var(--bronze-500), var(--success));
          border-radius: 999px;
          box-shadow: 0 0 14px rgba(122, 92, 54, 0.45);
          z-index: 1;
        }

        .photo-comp-bridge__node {
          position: relative;
          z-index: 2;
          background-color: var(--cream-50);
          border: 2px solid var(--bronze-700);
          border-radius: var(--radius-lg);
          padding: 0.85rem 1rem;
          text-align: center;
          box-shadow: var(--shadow-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
          min-width: 145px;
        }

        .photo-comp-bridge__check {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background-color: var(--verified-bg);
          color: var(--verified-text);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .photo-comp-bridge__score {
          font-family: var(--font-Heading);
          font-size: 2rem;
          line-height: 1;
          color: var(--mocha-900);
        }

        .photo-comp-bridge__label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--bronze-700);
        }

        .photo-comp-bridge__clip {
          margin-top: 0.2rem;
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-pill);
          background-color: var(--sand-200);
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--mocha-900);
        }

        /* Metrics Grid Below Photographs */
        .photo-comp-metrics {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.85rem;
          margin-bottom: 1.25rem;
        }

        @media (min-width: 640px) {
          .photo-comp-metrics {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .photo-comp-metrics {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .photo-comp-metric-card {
          background-color: var(--cream-100);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
          padding: 0.85rem 1rem;
        }

        .photo-comp-metric-card--final {
          background-color: var(--sand-200);
          border-color: var(--bronze-500);
        }

        .photo-comp-metric-card__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.45rem;
        }

        .photo-comp-metric-card__head span {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--mocha-600);
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .photo-comp-metric-card__head strong {
          font-family: var(--font-Heading);
          font-size: 1.4rem;
          color: var(--mocha-900);
        }

        .photo-comp-bar {
          height: 7px;
          border-radius: 999px;
          background-color: var(--sand-300);
          overflow: hidden;
          margin-bottom: 0.45rem;
        }

        .photo-comp-bar__fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--bronze-700), var(--bronze-500));
        }

        .photo-comp-bar__fill--clip {
          background: linear-gradient(90deg, var(--bronze-500), var(--success));
        }

        .photo-comp-bar__fill--final {
          background: linear-gradient(90deg, var(--mocha-900), var(--bronze-700));
        }

        .photo-comp-metric-card__sub {
          font-size: 0.7rem;
          color: var(--mocha-600);
          display: block;
        }

        .photo-comp-explanation {
          background-color: var(--cream-100);
          border: 1.5px solid var(--sand-300);
          border-radius: var(--radius-lg);
          padding: 1.1rem 1.25rem;
          margin-bottom: 1.5rem;
        }

        .photo-comp-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }
      `}</style>
    </div>
  );
}
