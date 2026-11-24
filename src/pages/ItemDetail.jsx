import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Clock,
  Tag,
  User,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Hash,
  Palette,
  Award,
  Edit3,
  XCircle,
  CopyPlus,
  Cpu,
  Maximize2,
  Eye,
} from 'lucide-react';
import ItemImage from '../components/ItemImage';
import Modal from '../components/Modal';
import { usePortalData } from '../context/PortalDataContext';
import { useAuth } from '../context/AuthContext';
import { getCategoryLabel } from '../data/mockData';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Card from '../components/Card';
import MatchCard from '../components/MatchCard';
import EmptyState from '../components/EmptyState';
import MatchingMethodToggle from '../components/MatchingMethodToggle';

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, users, getMatchesForItem, updateItemStatus } = usePortalData();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [algorithm, setAlgorithm] = useState('sbert');
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const item = items.find((i) => i.id === id);

  // Track Recently Viewed Items in localStorage for the Student Dashboard
  useEffect(() => {
    if (!item?.id) return;
    try {
      const raw = localStorage.getItem('campusfind_recently_viewed');
      const existing = raw ? JSON.parse(raw) : [];
      const next = [item.id, ...existing.filter((x) => x !== item.id)].slice(0, 6);
      localStorage.setItem('campusfind_recently_viewed', JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }, [item?.id]);

  if (!item) {
    return (
      <section className="section" style={{ paddingTop: 'calc(var(--navbar-height) + 3rem)' }}>
        <div className="container container--narrow">
          <EmptyState
            showIllustration
            title="Item report not found"
            description="The item you are looking for may have been removed or the link may be incorrect."
            action={
              <Button to="/browse" variant="primary">
                <ArrowLeft size={16} aria-hidden="true" /> Return to Browse Items
              </Button>
            }
          />
        </div>
      </section>
    );
  }

  // Only public display name & role are exposed (never phone, email, or student ID)
  const reporter = item.reporter || users.find((u) => u.id === item.userId);
  const likelyMatches = getMatchesForItem(item.id, { algorithm });
  const categoryLabel = getCategoryLabel(item.category);
  const stLower = String(item.status || '').toLowerCase();
  const isClosedOrReturned =
    stLower === 'returned' || stLower === 'closed' || stLower === 'resolved';
  const canClaim = item.type === 'found' && !isClosedOrReturned && stLower !== 'verified';
  const isOwner = Boolean(user && item.userId === user.id);

  // Build normalized photograph gallery list
  const galleryPhotos = (() => {
    if (Array.isArray(item.images) && item.images.length > 0) {
      return item.images.map((img) => ({
        url: img.imagePath || img.imageUrl,
        refId: img.imageEmbeddingReference || item.imageEmbeddingReference,
      }));
    }
    if (Array.isArray(item.photos) && item.photos.length > 0) {
      return item.photos.map((url) => ({
        url,
        refId: item.imageEmbeddingReference || null,
      }));
    }
    if (item.photo) {
      return [{ url: item.photo, refId: item.imageEmbeddingReference || null }];
    }
    return [];
  })();

  const safeIdx = Math.min(activePhotoIdx, Math.max(0, galleryPhotos.length - 1));
  const currentGalleryPhoto = galleryPhotos[safeIdx] || null;
  const displayItemForMainImage = currentGalleryPhoto
    ? { ...item, photo: currentGalleryPhoto.url }
    : item;

  const similarReportUrl = `/report?type=${item.type === 'lost' ? 'found' : 'lost'}&category=${encodeURIComponent(
    item.category
  )}&location=${encodeURIComponent(item.location)}`;

  const topMatch = likelyMatches[0] || null;

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <Link to="/browse">Browse Items</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span aria-current="page">{item.title}</span>
          </nav>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Badge status={item.type} />
            {item.status && <Badge status={item.status} />}
            {item.reportCode && <Badge variant="neutral">{item.reportCode}</Badge>}
            {currentGalleryPhoto?.refId && (
              <Badge variant="neutral">
                <Cpu size={12} aria-hidden="true" /> CLIP Indexed ({currentGalleryPhoto.refId.slice(0, 18)})
              </Badge>
            )}
          </div>
          <h1>{item.title}</h1>
        </div>
      </section>

      <section className="section section--compact">
        <div className="container">
          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Button to="/browse" variant="ghost" size="sm">
              <ArrowLeft size={15} aria-hidden="true" /> Back to Browse
            </Button>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {topMatch && (
                <Button to={`/photo-match/${encodeURIComponent(topMatch.id)}`} variant="secondary" size="sm">
                  <Eye size={14} aria-hidden="true" /> Animated Photo Comparison
                </Button>
              )}
              {(isOwner || isAdmin) && !isClosedOrReturned && (
                <>
                  <Button to={`/report?edit=${item.id}`} variant="secondary" size="sm">
                    <Edit3 size={14} aria-hidden="true" /> Edit Report
                  </Button>
                  <Button
                    variant="danger-outline"
                    size="sm"
                    onClick={() => updateItemStatus(item.id, 'Closed')}
                  >
                    <XCircle size={14} aria-hidden="true" /> Close Report
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="detail-layout">
            {/* Responsive Image Gallery Column */}
            <div className="detail-media">
              <div className="detail-gallery-main">
                <ItemImage item={displayItemForMainImage} square eager />
                {currentGalleryPhoto && (
                  <div className="detail-gallery-overlay">
                    <span className="detail-gallery-clip-tag">
                      <Cpu size={13} aria-hidden="true" /> CLIP ViT-B/32 Visual Embedding Ready
                    </span>
                    <button
                      type="button"
                      className="detail-gallery-zoom-btn"
                      onClick={() => setLightboxOpen(true)}
                      aria-label="Inspect full size photograph"
                    >
                      <Maximize2 size={14} aria-hidden="true" /> Expand
                    </button>
                  </div>
                )}
              </div>

              {/* Thumbnail Strip when 1+ uploaded photographs exist */}
              {galleryPhotos.length > 0 && (
                <div className="detail-gallery-thumbs" role="region" aria-label="Uploaded item photographs">
                  {galleryPhotos.map((p, idx) => (
                    <button
                      key={`${p.url}-${idx}`}
                      type="button"
                      className={`detail-gallery-thumb ${
                        idx === safeIdx ? 'detail-gallery-thumb--active' : ''
                      }`}
                      onClick={() => setActivePhotoIdx(idx)}
                      aria-label={`View photograph ${idx + 1}`}
                      aria-pressed={idx === safeIdx}
                    >
                      <img src={p.url} alt={`${item.title} thumbnail ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Metadata & Actions Column */}
            <Card className="detail-info">
              <span className="eyebrow">Report Details</span>
              <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: '0.75rem' }}>Description</h2>
              <p style={{ color: 'var(--mocha-900)', marginBottom: '1.15rem' }}>{item.description}</p>

              {item.distinguishingFeatures && (
                <div
                  style={{
                    backgroundColor: 'var(--cream-100)',
                    border: '1px solid var(--sand-300)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 0.9rem',
                    marginBottom: '1.15rem',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <strong style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--bronze-700)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
                    Distinguishing Features
                  </strong>
                  {item.distinguishingFeatures}
                </div>
              )}

              <dl className="detail-meta">
                <div className="detail-meta__row">
                  <dt><Hash size={15} aria-hidden="true" /> Report ID</dt>
                  <dd>{item.reportCode || item.id}</dd>
                </div>
                <div className="detail-meta__row">
                  <dt><Tag size={15} aria-hidden="true" /> Category</dt>
                  <dd>{categoryLabel}</dd>
                </div>
                <div className="detail-meta__row">
                  <dt><MapPin size={15} aria-hidden="true" /> Location</dt>
                  <dd>{item.location}</dd>
                </div>
                <div className="detail-meta__row">
                  <dt><Calendar size={15} aria-hidden="true" /> Date</dt>
                  <dd>{item.date}</dd>
                </div>
                <div className="detail-meta__row">
                  <dt><Clock size={15} aria-hidden="true" /> Approximate Time</dt>
                  <dd>{item.time || 'Not specified'}</dd>
                </div>
                <div className="detail-meta__row">
                  <dt><Palette size={15} aria-hidden="true" /> Color</dt>
                  <dd>{item.color || 'Not specified'}</dd>
                </div>
                {item.brand && (
                  <div className="detail-meta__row">
                    <dt><Award size={15} aria-hidden="true" /> Brand</dt>
                    <dd>{item.brand}</dd>
                  </div>
                )}
                <div className="detail-meta__row">
                  <dt><User size={15} aria-hidden="true" /> Reported By</dt>
                  <dd>{reporter ? `${reporter.name} (${reporter.role})` : 'Campus Member'}</dd>
                </div>
              </dl>

              <hr className="divider" />

              {stLower === 'returned' || stLower === 'resolved' ? (
                <div className="alert alert--success" role="status">
                  <CheckCircle2 size={20} style={{ flexShrink: 0 }} aria-hidden="true" />
                  <div>
                    <strong>Returned &amp; Handover Recorded</strong>
                    <p style={{ margin: '0.2rem 0 0', fontSize: 'var(--text-xs)', color: 'inherit' }}>
                      This item has completed administrative verification and recorded handover.
                    </p>
                  </div>
                </div>
              ) : stLower === 'closed' ? (
                <div className="alert alert--warning" role="status">
                  <div>
                    <strong>Report Closed</strong>
                    <p style={{ margin: '0.2rem 0 0', fontSize: 'var(--text-xs)' }}>
                      This report has been closed and is no longer accepting new claims.
                    </p>
                  </div>
                </div>
              ) : isAuthenticated && !isAdmin ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {canClaim ? (
                    <Button to={`/claim/${item.id}`} variant="primary" size="lg" fullWidth>
                      <ShieldCheck size={18} aria-hidden="true" /> Submit Ownership Claim
                    </Button>
                  ) : item.type === 'lost' ? (
                    <Button to={similarReportUrl} variant="primary" size="lg" fullWidth>
                      <CopyPlus size={17} aria-hidden="true" /> Found This? Report Matching Found Item
                    </Button>
                  ) : null}

                  <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <Button to={`/matches/${item.id}`} variant="secondary" style={{ flex: 1 }}>
                      <Sparkles size={16} aria-hidden="true" /> View AI Matches ({likelyMatches.length})
                    </Button>
                    {topMatch && (
                      <Button
                        to={`/photo-match/${encodeURIComponent(topMatch.id)}`}
                        variant="secondary"
                        style={{ flex: 1 }}
                      >
                        <Eye size={15} aria-hidden="true" /> Photo Match
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      style={{ flex: 1 }}
                      onClick={() => navigate(similarReportUrl)}
                    >
                      <CopyPlus size={15} aria-hidden="true" /> Report Similar
                    </Button>
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)', textAlign: 'center' }}>
                    Private contact details and claimant evidence are protected and visible only to
                    verifying administrators.
                  </p>
                </div>
              ) : isAdmin ? (
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <Button to="/admin/items" variant="primary" style={{ flex: 1 }}>
                    Manage in Admin Panel
                  </Button>
                  <Button to={`/matches/${item.id}`} variant="secondary" style={{ flex: 1 }}>
                    <Sparkles size={16} aria-hidden="true" /> Inspect AI Matches
                  </Button>
                </div>
              ) : (
                <div className="alert alert--info">
                  <ShieldCheck size={20} style={{ flexShrink: 0, color: 'var(--bronze-700)' }} aria-hidden="true" />
                  <div>
                    <strong>Recognize this belonging?</strong>
                    <p style={{ margin: '0.25rem 0 0.75rem', fontSize: 'var(--text-xs)' }}>
                      Sign in with your university account to submit an ownership claim or report a
                      similar item.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Button to="/login" variant="primary" size="sm">
                        Sign In to Claim
                      </Button>
                      {topMatch && (
                        <Button to={`/photo-match/${encodeURIComponent(topMatch.id)}`} variant="secondary" size="sm">
                          <Eye size={14} aria-hidden="true" /> View Animated Photo Match
                        </Button>
                      )}
                      <Button to="/browse" variant="secondary" size="sm">
                        Back to Browse
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Likely Matches Preview */}
          {likelyMatches.length > 0 && (
            <section style={{ marginTop: '3.25rem' }} aria-labelledby="detail-matches-heading">
              <div className="detail-matches-head">
                <div>
                  <span className="eyebrow">Multimodal Item Matching (Text + CLIP Image)</span>
                  <h2 id="detail-matches-heading" style={{ fontSize: 'var(--text-2xl)' }}>
                    Likely opposite-type matches
                  </h2>
                </div>
                <MatchingMethodToggle value={algorithm} onChange={setAlgorithm} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {likelyMatches.map((m, idx) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    rank={idx + 1}
                    showClaimAction={isAuthenticated && !isAdmin}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </section>

      {/* Lightbox Modal for Full-Resolution Photograph Inspection */}
      <Modal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={`${item.title} (${item.reportCode || item.id})`}
        maxWidth="780px"
        footer={
          <Button variant="secondary" onClick={() => setLightboxOpen(false)}>
            Close Photograph
          </Button>
        }
      >
        {currentGalleryPhoto && (
          <div style={{ textAlign: 'center' }}>
            <img
              src={currentGalleryPhoto.url}
              alt={item.title}
              style={{
                maxWidth: '100%',
                maxHeight: '520px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--sand-300)',
                margin: '0 auto',
                objectFit: 'contain',
              }}
            />
            {galleryPhotos.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.85rem' }}>
                {galleryPhotos.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`btn btn--sm ${idx === safeIdx ? 'btn--primary' : 'btn--secondary'}`}
                    onClick={() => setActivePhotoIdx(idx)}
                  >
                    Photo #{idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

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

        .detail-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          align-items: start;
        }

        @media (min-width: 1024px) {
          .detail-layout {
            grid-template-columns: 1fr 1.12fr;
            gap: 2.5rem;
          }

          .detail-media {
            position: sticky;
            top: calc(var(--navbar-height) + 1.5rem);
          }
        }

        .detail-gallery-main {
          position: relative;
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }

        .detail-gallery-overlay {
          position: absolute;
          bottom: 0.75rem;
          left: 0.75rem;
          right: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          flex-wrap: wrap;
          pointer-events: none;
        }

        .detail-gallery-clip-tag {
          padding: 0.28rem 0.65rem;
          border-radius: var(--radius-pill);
          background-color: rgba(61, 48, 38, 0.86);
          color: var(--cream-50);
          font-size: 0.7rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          backdrop-filter: blur(4px);
        }

        .detail-gallery-zoom-btn {
          pointer-events: auto;
          padding: 0.28rem 0.65rem;
          border-radius: var(--radius-pill);
          background-color: rgba(255, 253, 248, 0.92);
          color: var(--mocha-900);
          border: 1px solid var(--sand-300);
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .detail-gallery-thumbs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          margin-top: 0.75rem;
        }

        .detail-gallery-thumb {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 2px solid var(--sand-300);
          padding: 0;
          cursor: pointer;
          background: var(--cream-100);
          transition: all 0.2s ease;
        }

        .detail-gallery-thumb--active {
          border-color: var(--bronze-700);
          box-shadow: 0 0 0 2px rgba(122, 92, 54, 0.22);
        }

        .detail-gallery-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .detail-meta {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }

        @media (min-width: 640px) {
          .detail-meta {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .detail-meta__row {
          background-color: var(--cream-100);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
          padding: 0.75rem 0.9rem;
        }

        .detail-meta__row dt {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--mocha-600);
          margin-bottom: 0.2rem;
        }

        .detail-meta__row dd {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--mocha-900);
        }

        .detail-matches-head {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }
      `}</style>
    </div>
  );
}
