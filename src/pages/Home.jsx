import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  FilePlus2,
  Sparkles,
  ShieldCheck,
  Users,
  CreditCard,
  Smartphone,
  BookOpen,
  Key,
  Briefcase,
  Package,
  MapPin,
  Calendar,
  ArrowRight,
  Cpu,
  Image as ImageIcon,
  FileText,
  Sliders,
  Building2,
  PackageCheck,
  Search,
  Bell,
  QrCode,
  GraduationCap,
} from 'lucide-react';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Card from '../components/Card';
import ItemImage from '../components/ItemImage';
import EmptyState from '../components/EmptyState';
import { useAnimatedCounter } from '../components/AnimatedPhotoMatcher';
import { usePortalData } from '../context/PortalDataContext';
import { getCategoryLabel } from '../data/mockData';
import { SITE } from '../data/siteConfig';

const HOW_IT_WORKS_STEPS = [
  {
    number: '01',
    icon: FilePlus2,
    title: '01 – Report Your Item',
    description: 'Upload the item description, photograph, and campus location.',
  },
  {
    number: '02',
    icon: Cpu,
    title: '02 – AI Analyzes Details',
    description: 'The system analyzes text and image information.',
  },
  {
    number: '03',
    icon: Sparkles,
    title: '03 – Discover Smart Matches',
    description: 'AI identifies and ranks potential matching reports.',
  },
  {
    number: '04',
    icon: ShieldCheck,
    title: '04 – Recover Your Belongings',
    description: 'Verify ownership and complete the handover.',
  },
];

const AI_TECHNOLOGIES = [
  {
    icon: Sparkles,
    badge: 'Semantic NLP',
    title: 'Sentence-BERT',
    description: 'Understands semantic meaning and description similarity.',
  },
  {
    icon: FileText,
    badge: 'Lexical Matching',
    title: 'TF-IDF',
    description: 'Analyzes keyword frequency and text similarity.',
  },
  {
    icon: ImageIcon,
    badge: 'Computer Vision',
    title: 'CLIP ViT-B/32',
    description: 'Compares uploaded photographs using visual embeddings.',
  },
  {
    icon: Sliders,
    badge: 'Campus Context',
    title: 'Contextual Matching',
    description: 'Considers category, location, date, color, and other item details.',
  },
];

const PIPELINE_STAGES = [
  { step: '01', title: 'Item Reports', sub: 'Photos + description' },
  { step: '02', title: 'Text and Image Processing', sub: 'NLP + visual vectors' },
  { step: '03', title: 'AI Analysis', sub: 'SBERT + TF-IDF + CLIP' },
  { step: '04', title: 'Similarity Ranking', sub: 'Weighted cosine score' },
  { step: '05', title: 'Potential Matches', sub: 'Verified campus alerts' },
];

const FEATURE_SHOWCASE = [
  {
    icon: Sparkles,
    title: 'Intelligent AI Matching',
    description:
      'Automatically ranks lost and found reports using Sentence-BERT semantic meaning and TF-IDF keywords.',
  },
  {
    icon: ImageIcon,
    title: 'Photo-Based Item Discovery',
    description:
      'Compares uploaded photographs with CLIP ViT-B/32 visual embeddings and interactive side-by-side magnification.',
  },
  {
    icon: Bell,
    title: 'Real-Time Notifications',
    description:
      'Alerts students and faculty inside the portal as soon as a high-alignment match or claim update arrives.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Ownership Claims',
    description:
      'Safeguards private claimant proof and restricts ownership approvals strictly to authorized campus administrators.',
  },
  {
    icon: QrCode,
    title: 'QR-Based Handover',
    description:
      'Issues a unique institutional handover code and verification QR token for accountable item collection.',
  },
  {
    icon: Building2,
    title: 'Centralized Campus Reporting',
    description:
      'Replaces scattered notice boards with dedicated, role-separated Student, Faculty, and Admin dashboards.',
  },
];

const CATEGORY_TABS = [
  { id: 'all', label: 'All Items', icon: Package },
  { id: 'id-card', label: 'ID Cards & Wallets', icon: CreditCard },
  { id: 'phone', label: 'Phones & Electronics', icon: Smartphone },
  { id: 'book', label: 'Books & Notes', icon: BookOpen },
  { id: 'key', label: 'Keys & Access Tags', icon: Key },
  { id: 'bag', label: 'Bags & Backpacks', icon: Briefcase },
  { id: 'other', label: 'Earbuds & Others', icon: Package },
];

const HERO_BELONGINGS = [
  { src: '/images/earbuds.jpg', label: 'Wireless Earbuds', tag: 'Student Center' },
  { src: '/images/id-card.jpg', label: 'Student ID & Wallet', tag: 'Main Library' },
  { src: '/images/backpack.jpg', label: 'Backpack', tag: 'Auditorium' },
  { src: '/images/keys.jpg', label: 'Keys', tag: 'Parking Area' },
  { src: '/images/book.jpg', label: 'Books', tag: 'Computer Lab' },
  { src: '/images/mobile-black.jpg', label: 'Smartphone', tag: 'Cafeteria' },
];

export default function Home() {
  const prefersReducedMotion = useReducedMotion();
  const { items = [], aiMatches = [], users = [], stats, isLoading } = usePortalData();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [matchEngineHovered, setMatchEngineHovered] = useState(false);

  // Real database counts (never hardcoded or randomized)
  const totalItemsReported =
    (stats?.totalLostReports ?? 0) + (stats?.totalFoundReports ?? 0) || items.length;
  const itemsRecoveredCount =
    items.filter((i) => ['returned', 'resolved'].includes(String(i.status).toLowerCase())).length ||
    (stats?.returnedItems ?? 0);
  const activeMatchesCount = stats?.totalAiMatches ?? aiMatches.length;
  const registeredUsersCount =
    (stats?.totalStudents ?? 0) + (stats?.totalStaff ?? 0) + 1 || users.length;

  const animItemsReported = useAnimatedCounter(totalItemsReported, true, Boolean(prefersReducedMotion), 950);
  const animItemsRecovered = useAnimatedCounter(itemsRecoveredCount, true, Boolean(prefersReducedMotion), 950);
  const animActiveMatches = useAnimatedCounter(activeMatchesCount, true, Boolean(prefersReducedMotion), 950);
  const animCampusUsers = useAnimatedCounter(registeredUsersCount, true, Boolean(prefersReducedMotion), 950);

  const filteredRecentItems = useMemo(() => {
    const list =
      selectedCategory === 'all'
        ? items
        : items.filter((item) => item.category === selectedCategory);
    return list.slice(0, 8);
  }, [items, selectedCategory]);

  const featuredMatch = aiMatches[0] || null;
  const featuredScorePct = featuredMatch ? Math.round((featuredMatch.score || 0) * 100) : null;
  const featuredClipPct =
    featuredMatch?.clipImageScore !== null && featuredMatch?.clipImageScore !== undefined
      ? Math.round(featuredMatch.clipImageScore * 100)
      : null;
  const featuredSbertPct = featuredMatch?.sbertSimilarity
    ? Math.round(featuredMatch.sbertSimilarity * 100)
    : null;

  return (
    <div className="hp-root">
      {/* =====================================================================
          3. PREMIUM SPLIT-SCREEN HERO SECTION
          ===================================================================== */}
      <section className="hp-hero" aria-labelledby="hero-heading">
        <div className="hp-hero__bg-shape-1" aria-hidden="true" />
        <div className="hp-hero__bg-shape-2" aria-hidden="true" />

        <div className="container hp-hero__grid">
          {/* LEFT SIDE */}
          <motion.div
            className="hp-hero__left"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <span className="hp-hero__eyebrow">
              SMART CAMPUS LOST &amp; FOUND · OUTR BHUBANESWAR
            </span>

            <h1 id="hero-heading" className="hp-hero__title">
              Lost Something on Campus? Let&apos;s Find It.
            </h1>

            <p className="hp-hero__sub">
              Reconnect with your belongings through intelligent AI-powered text and image matching.
              A smarter, faster way to discover lost items around your campus.
            </p>

            {/* Primary, Secondary, and Found Item Action */}
            <motion.div
              className="hp-hero__ctas"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <Button to="/report?type=lost" variant="primary" size="lg">
                Report Lost Item <ArrowRight size={17} aria-hidden="true" />
              </Button>
              <Button to="/browse?type=found" variant="secondary" size="lg">
                <Search size={16} aria-hidden="true" /> Explore Found Items
              </Button>
              <Link to="/report?type=found" className="hp-hero__found-link">
                Report Found Item →
              </Link>
            </motion.div>

            {/* Technology Indicators */}
            <ul className="hp-hero__indicators" aria-label="Platform AI and security technologies">
              <li>
                <Sparkles size={14} aria-hidden="true" /> AI Text Matching
              </li>
              <li>
                <ImageIcon size={14} aria-hidden="true" /> CLIP Image Recognition
              </li>
              <li>
                <QrCode size={14} aria-hidden="true" /> Secure QR Handover
              </li>
            </ul>

            {/* Role Portals Quick Access */}
            <div className="hp-hero__portals">
              <Link to="/login" className="hp-portal-chip">
                <Users size={13} aria-hidden="true" /> Student Portal
              </Link>
              <Link to="/faculty/login" className="hp-portal-chip">
                <GraduationCap size={13} aria-hidden="true" /> Faculty Portal
              </Link>
              <Link to="/admin/login" className="hp-portal-chip">
                <ShieldCheck size={13} aria-hidden="true" /> Admin Console
              </Link>
            </div>
          </motion.div>

          {/* RIGHT SIDE: Editorial Belongings & AI Matching Composition */}
          <motion.div
            className={`hp-hero__right ${matchEngineHovered ? 'hp-hero__right--active' : ''}`}
            aria-label="Campus belongings visual matching showcase"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            onMouseEnter={() => setMatchEngineHovered(true)}
            onMouseLeave={() => setMatchEngineHovered(false)}
          >
            {/* Floating Interface Pills */}
            <div className="hp-hero-float-row">
              <motion.div
                className="hp-float-pill"
                animate={
                  matchEngineHovered && !prefersReducedMotion ? { y: [0, -4, 0] } : { y: 0 }
                }
                transition={
                  matchEngineHovered && !prefersReducedMotion
                    ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.2 }
                }
              >
                <span className="hp-float-pill__dot" />
                <span>Potential Match Found</span>
              </motion.div>
              <motion.div
                className="hp-float-pill hp-float-pill--outline"
                animate={
                  matchEngineHovered && !prefersReducedMotion ? { y: [0, 4, 0] } : { y: 0 }
                }
                transition={
                  matchEngineHovered && !prefersReducedMotion
                    ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.2 }
                }
              >
                <Cpu size={13} aria-hidden="true" />
                <span>AI Visual Analysis</span>
              </motion.div>
            </div>

            <div className={`hp-comp-card ${matchEngineHovered ? 'hp-comp-card--animating' : ''}`}>
              <div className="hp-comp-card__head">
                <span className="hp-comp-card__kicker">
                  <Sparkles size={13} aria-hidden="true" /> Multimodal Match Engine
                </span>
                <Badge status="matched">
                  {featuredScorePct !== null
                    ? `${featuredScorePct}% Similarity`
                    : 'CLIP + SBERT Active'}
                </Badge>
              </div>

              {/* Connected Lost & Found Photographs */}
              <div className="hp-comp-pair">
                <div className="hp-comp-photo">
                  <div className="hp-comp-scan" aria-hidden="true" />
                  <img
                    src={featuredMatch?.lostItem?.photo || '/images/id-card.jpg'}
                    alt={featuredMatch?.lostItem?.title || 'Lost Student ID Card'}
                  />
                  <span className="hp-comp-tag hp-comp-tag--lost">LOST</span>
                  <small>{featuredMatch?.lostItem?.reportCode || 'LST REPORT'}</small>
                </div>

                <div className="hp-comp-bridge" aria-hidden="true">
                  <div className="hp-comp-line">
                    {!prefersReducedMotion && (
                      <motion.span
                        className="hp-comp-pulse"
                        animate={
                          matchEngineHovered
                            ? { left: ['10%', '86%', '10%'] }
                            : { left: '48%' }
                        }
                        transition={
                          matchEngineHovered
                            ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
                            : { duration: 0.2 }
                        }
                      />
                    )}
                  </div>
                  <Link to="/matches" className="hp-comp-orb">
                    <strong>{featuredScorePct !== null ? `${featuredScorePct}%` : 'AI'}</strong>
                    <span>Similarity</span>
                  </Link>
                  <div className="hp-comp-line" />
                </div>

                <div className="hp-comp-photo">
                  <div className="hp-comp-scan hp-comp-scan--delay" aria-hidden="true" />
                  <img
                    src={featuredMatch?.foundItem?.photo || '/images/id-card.jpg'}
                    alt={featuredMatch?.foundItem?.title || 'Found Student ID Card'}
                  />
                  <span className="hp-comp-tag hp-comp-tag--found">FOUND</span>
                  <small>{featuredMatch?.foundItem?.reportCode || 'FND REPORT'}</small>
                </div>
              </div>

              {/* 6 Campus Belongings Cards Grid */}
              <div className="hp-belongings-section">
                <div className="hp-belongings-section__head">
                  <span>Tracked Campus Belongings</span>
                  <Link to="/browse">Explore Directory →</Link>
                </div>
                <div className="hp-belongings-grid">
                  {HERO_BELONGINGS.map((b) => (
                    <Link to="/browse" key={b.label} className="hp-belonging-item">
                      <img src={b.src} alt={b.label} loading="lazy" />
                      <div className="hp-belonging-item__txt">
                        <strong>{b.label}</strong>
                        <span>{b.tag}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =====================================================================
          5. MODERN LIVE STATISTICS SECTION
          ===================================================================== */}
      <section className="hp-section hp-section--sand" aria-labelledby="live-stats-heading">
        <div className="container">
          <div className="hp-section-bar">
            <div>
              <span className="eyebrow">Live Campus Telemetry</span>
              <h2 id="live-stats-heading">Campus Recovery Snapshot</h2>
            </div>
            <Link to="/evaluation" className="hp-link-more">
              View AI Evaluation Metrics <ArrowRight size={14} />
            </Link>
          </div>

          <div className="hp-stats-grid">
            <Card className="hp-stat-card">
              <div className="hp-stat-card__icon">
                <FileText size={20} />
              </div>
              <span className="hp-stat-card__label">Total Items Reported</span>
              <strong className="hp-stat-card__val">{animItemsReported}</strong>
              <span className="hp-stat-card__sub">Active campus database reports</span>
            </Card>

            <Card className="hp-stat-card">
              <div className="hp-stat-card__icon hp-stat-card__icon--sage">
                <PackageCheck size={20} />
              </div>
              <span className="hp-stat-card__label">Items Successfully Recovered</span>
              <strong className="hp-stat-card__val">{animItemsRecovered}</strong>
              <span className="hp-stat-card__sub">Verified &amp; handed over</span>
            </Card>

            <Card className="hp-stat-card">
              <div className="hp-stat-card__icon hp-stat-card__icon--amber">
                <Sparkles size={20} />
              </div>
              <span className="hp-stat-card__label">Active AI Matches</span>
              <strong className="hp-stat-card__val">{animActiveMatches}</strong>
              <span className="hp-stat-card__sub">Multimodal SBERT + CLIP pairs</span>
            </Card>

            <Card className="hp-stat-card">
              <div className="hp-stat-card__icon hp-stat-card__icon--tan">
                <Users size={20} />
              </div>
              <span className="hp-stat-card__label">Registered Campus Users</span>
              <strong className="hp-stat-card__val">{animCampusUsers}</strong>
              <span className="hp-stat-card__sub">Students, faculty &amp; staff</span>
            </Card>
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. PREMIUM HOW IT WORKS SECTION
          ===================================================================== */}
      <section id="how-it-works" className="hp-section" aria-labelledby="how-heading">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">How CampusFind Works</span>
            <h2 id="how-heading">From Lost to Found in Four Simple Steps</h2>
            <p className="section-head__sub">
              Every lost or found report triggers automated text and photo analysis to help owners
              recover belongings quickly and safely.
            </p>
          </div>

          <ol className="hp-how-grid">
            {HOW_IT_WORKS_STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.li
                  key={step.number}
                  className="hp-how-card"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.35, delay: idx * 0.08 }}
                >
                  {idx < HOW_IT_WORKS_STEPS.length - 1 && (
                    <span className="hp-how-card__connector" aria-hidden="true" />
                  )}
                  <div className="hp-how-card__top">
                    <span className="hp-how-card__num">{step.number}</span>
                    <div className="hp-how-card__icon">
                      <Icon size={20} />
                    </div>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* =====================================================================
          7. MODERN AI TECHNOLOGY SHOWCASE
          ===================================================================== */}
      <section className="hp-section hp-section--sand" aria-labelledby="ai-tech-heading">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Multimodal Intelligence</span>
            <h2 id="ai-tech-heading">Powered by Intelligent Multimodal AI</h2>
            <p className="section-head__sub">
              CampusFind combines language understanding, keyword recall, computer vision, and
              campus context to rank the most relevant matches automatically.
            </p>
          </div>

          <div className="hp-tech-grid">
            {AI_TECHNOLOGIES.map((tech, idx) => {
              const Icon = tech.icon;
              return (
                <motion.div
                  key={tech.title}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35, delay: idx * 0.06 }}
                >
                  <Card hover className="hp-tech-card">
                    <div className="hp-tech-card__head">
                      <div className="icon-box" style={{ marginBottom: 0 }}>
                        <Icon size={20} />
                      </div>
                      <Badge variant="neutral">{tech.badge}</Badge>
                    </div>
                    <h3>{tech.title}</h3>
                    <p>{tech.description}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="hp-pipeline-box" aria-label="AI matching architecture workflow">
            <div className="hp-pipeline-box__title">
              <Cpu size={15} />
              <span>Visual Matching Workflow</span>
            </div>
            <div className="hp-pipeline-flow">
              {PIPELINE_STAGES.map((stage, idx) => (
                <div key={stage.step} className="hp-pipeline-node-wrap">
                  <div className="hp-pipeline-node">
                    <span className="hp-pipeline-node__num">{stage.step}</span>
                    <strong>{stage.title}</strong>
                    <small>{stage.sub}</small>
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <span className="hp-pipeline-arrow" aria-hidden="true">
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. RECENT LOST AND FOUND ITEMS
          ===================================================================== */}
      <section className="hp-section" aria-labelledby="recent-items-heading">
        <div className="container">
          <div className="hp-section-bar">
            <div>
              <span className="eyebrow">Live Campus Directory</span>
              <h2 id="recent-items-heading">Recently Reported Around Campus</h2>
            </div>
            <Button to="/browse" variant="secondary" size="sm">
              View All Items ({items.length}) <ArrowRight size={14} />
            </Button>
          </div>

          <div className="hp-cat-tabs" role="tablist" aria-label="Filter recent items by category">
            {CATEGORY_TABS.map((cat) => {
              const Icon = cat.icon;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`hp-cat-tab ${active ? 'hp-cat-tab--active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <Icon size={15} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="hp-items-grid" aria-label="Loading recent campus items">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="hp-item-skeleton" />
              ))}
            </div>
          ) : filteredRecentItems.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No reports in this category yet"
              description="Try selecting another category or view all campus lost and found items."
              action={
                <Button variant="primary" size="sm" onClick={() => setSelectedCategory('all')}>
                  Show All Items
                </Button>
              }
            />
          ) : (
            <div className="hp-items-grid">
              {filteredRecentItems.map((item, idx) => (
                <motion.article
                  key={item.id}
                  className="card card--hover hp-item-card"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.12 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                >
                  <div className="hp-item-card__media">
                    <ItemImage item={item} />
                    <div className="hp-item-card__badges">
                      <Badge status={item.type}>{item.type === 'lost' ? 'LOST' : 'FOUND'}</Badge>
                      {item.status && <Badge status={item.status} />}
                    </div>
                  </div>

                  <div className="hp-item-card__body">
                    <span className="hp-item-card__cat">
                      {getCategoryLabel(item.category)} · {item.reportCode || item.id}
                    </span>
                    <h3 className="hp-item-card__title">
                      <Link to={`/items/${item.id}`}>{item.title}</Link>
                    </h3>
                    <div className="hp-item-card__meta">
                      <span>
                        <MapPin size={13} aria-hidden="true" /> {item.location}
                      </span>
                      <span>
                        <Calendar size={13} aria-hidden="true" /> {item.date}
                      </span>
                    </div>
                    <Button to={`/items/${item.id}`} variant="secondary" size="sm" fullWidth>
                      View Details <ArrowRight size={14} aria-hidden="true" />
                    </Button>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          9. LIVE AI MATCHING SHOWCASE
          ===================================================================== */}
      <section className="hp-section hp-section--sand" aria-labelledby="ai-showcase-heading">
        <div className="container">
          <div className="hp-match-showcase">
            <div className="hp-match-showcase__left">
              <span className="eyebrow">
                {featuredMatch ? 'Live AI Match Connection' : 'Illustrative Match Demonstration'}
              </span>
              <h2 id="ai-showcase-heading">
                See How CampusFind AI Connects Lost and Found Reports
              </h2>
              <p className="hp-match-showcase__desc">
                {featuredMatch?.matchingExplanation ||
                  'Sample Demonstration: Sentence-BERT semantic meaning alignment combined with CLIP ViT-B/32 visual embedding similarity connects matching Lost & Found items across campus locations.'}
              </p>

              <div className="hp-match-showcase__metrics">
                <div className="hp-showcase-metric">
                  <span>Similarity Score</span>
                  <strong>{featuredScorePct !== null ? `${featuredScorePct}%` : 'Demo'}</strong>
                </div>
                <div className="hp-showcase-metric">
                  <span>Visual Similarity</span>
                  <strong>{featuredClipPct !== null ? `${featuredClipPct}%` : 'CLIP Ready'}</strong>
                </div>
                <div className="hp-showcase-metric">
                  <span>Text Alignment</span>
                  <strong>{featuredSbertPct !== null ? `${featuredSbertPct}%` : 'SBERT NLP'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Button to="/matches" variant="primary">
                  <Sparkles size={16} /> Explore AI Matches
                </Button>
                <Button to="/photo-match" variant="secondary">
                  <ImageIcon size={16} /> Open Photo Comparison
                </Button>
              </div>
            </div>

            <div className="hp-match-showcase__right">
              <div className="hp-showcase-pair">
                <div className="hp-showcase-item">
                  <img
                    src={featuredMatch?.lostItem?.photo || '/images/id-card.jpg'}
                    alt={featuredMatch?.lostItem?.title || 'Sample Lost ID Card'}
                  />
                  <Badge status="lost">
                    {featuredMatch ? 'LOST' : 'SAMPLE LOST'}
                  </Badge>
                  <h4>
                    {featuredMatch?.lostItem?.title ||
                      'Student ID Card (Sample Demonstration)'}
                  </h4>
                  <span>
                    <MapPin size={12} /> {featuredMatch?.lostItem?.location || 'Main Library'}
                  </span>
                </div>

                <div className="hp-showcase-bridge" aria-hidden="true">
                  <div className="hp-showcase-bridge__line" />
                  <div className="hp-showcase-bridge__orb">
                    <Sparkles size={14} />
                    <strong>{featuredScorePct !== null ? `${featuredScorePct}%` : 'Demo'}</strong>
                    <small>Visual + Text</small>
                  </div>
                  <div className="hp-showcase-bridge__line" />
                </div>

                <div className="hp-showcase-item">
                  <img
                    src={featuredMatch?.foundItem?.photo || '/images/id-card.jpg'}
                    alt={featuredMatch?.foundItem?.title || 'Sample Found ID Card'}
                  />
                  <Badge status="found">
                    {featuredMatch ? 'FOUND' : 'SAMPLE FOUND'}
                  </Badge>
                  <h4>
                    {featuredMatch?.foundItem?.title ||
                      'Found ID Badge Outside Entrance (Demo)'}
                  </h4>
                  <span>
                    <MapPin size={12} /> {featuredMatch?.foundItem?.location || 'Main Library'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          10. PREMIUM FEATURE SECTION (6 Feature Cards)
          ===================================================================== */}
      <section className="hp-section" aria-labelledby="features-heading">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Why CampusFind</span>
            <h2 id="features-heading">Built for Campus Trust, Speed, and Accountability</h2>
            <p className="section-head__sub">
              Designed for {SITE.university} with secure role separation, photo verification, and
              audit-logged handovers.
            </p>
          </div>

          <div className="hp-features-grid">
            {FEATURE_SHOWCASE.map((feat) => {
              const Icon = feat.icon;
              return (
                <Card key={feat.title} hover className="hp-feature-card">
                  <div className="icon-box" aria-hidden="true">
                    <Icon size={21} strokeWidth={1.75} />
                  </div>
                  <h3>{feat.title}</h3>
                  <p>{feat.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          11. MODERN CALL-TO-ACTION SECTION
          ===================================================================== */}
      <section className="hp-section hp-section--sand" aria-labelledby="cta-heading">
        <div className="container">
          <div className="hp-cta-banner">
            <div className="hp-cta-banner__text">
              <span className="eyebrow">OUTR Campus Community</span>
              <h2 id="cta-heading">Every Lost Item Deserves to Be Found.</h2>
              <p>
                Make your campus smarter, safer, and more connected with AI-powered lost and found.
              </p>
              <div className="hp-cta-banner__actions">
                <Button to="/report" variant="primary" size="lg">
                  Report an Item <ArrowRight size={17} aria-hidden="true" />
                </Button>
                <Button to="/browse?type=found" variant="secondary" size="lg">
                  Browse Found Items
                </Button>
              </div>
            </div>

            <div className="hp-cta-banner__media">
              <img
                src="/images/campus-hero.jpg"
                alt={`Walkway and academic buildings at ${SITE.university}, ${SITE.city}`}
                loading="lazy"
                decoding="async"
                width="640"
                height="400"
              />
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .hp-root {
          background-color: #F5F0E8;
          color: #3D3228;
          overflow-x: clip;
        }

        .hp-section {
          padding: clamp(2.75rem, 5vw, 4.75rem) 0;
        }
        .hp-section--sand {
          background-color: #EDE4D8;
          border-top: 1px solid #E3D8C9;
          border-bottom: 1px solid #E3D8C9;
        }

        .hp-section-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .hp-section-bar h2 {
          margin: 0;
          font-size: clamp(1.5rem, 2.8vw, 2.15rem);
          color: #3D3228;
        }
        .hp-link-more {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.86rem;
          font-weight: 700;
          color: #A67C52;
        }
        .hp-link-more:hover {
          color: #896642;
        }

        /* 3 & 4. Hero Split Composition */
        .hp-hero {
          position: relative;
          padding-top: calc(var(--navbar-height) + clamp(1.75rem, 4.5vw, 3.75rem));
          padding-bottom: clamp(2.5rem, 5vw, 4.5rem);
          background-color: #F5F0E8;
          background-image:
            radial-gradient(circle, rgba(166, 124, 82, 0.16) 1.35px, transparent 1.55px),
            radial-gradient(circle, rgba(196, 164, 132, 0.22) 1.35px, transparent 1.55px),
            radial-gradient(circle, rgba(227, 216, 201, 0.55) 1.5px, transparent 1.7px);
          background-size: 28px 28px, 28px 28px, 56px 56px;
          background-position: 0 0, 14px 14px, 7px 21px;
          overflow: hidden;
        }
        .hp-hero__bg-shape-1 {
          position: absolute;
          top: -120px;
          right: -120px;
          width: 460px;
          height: 460px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(196, 164, 132, 0.24) 0%, transparent 70%);
          pointer-events: none;
        }
        .hp-hero__bg-shape-2 {
          position: absolute;
          bottom: -140px;
          left: -100px;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(237, 228, 216, 0.85) 0%, transparent 72%);
          pointer-events: none;
        }

        .hp-hero__grid {
          position: relative;
          display: grid;
          grid-template-columns: 1fr;
          gap: 2.25rem;
          align-items: center;
        }
        @media (min-width: 1024px) {
          .hp-hero__grid {
            grid-template-columns: 1.04fr 0.96fr;
            gap: 3rem;
          }
        }

        .hp-hero__eyebrow {
          display: inline-block;
          font-size: clamp(0.66rem, 1vw, 0.75rem);
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #A67C52;
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          padding: 0.3rem 0.82rem;
          border-radius: 999px;
          margin-bottom: 0.95rem;
          max-width: 100%;
        }

        .hp-hero__title {
          font-size: clamp(2rem, 4.4vw, 3.6rem);
          line-height: 1.08;
          color: #3D3228;
          margin-bottom: 1rem;
        }

        .hp-hero__sub {
          font-size: clamp(0.95rem, 1.3vw, 1.12rem);
          color: #82776B;
          max-width: 560px;
          line-height: 1.65;
          margin-bottom: 1.6rem;
        }

        .hp-hero__ctas {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.75rem 1rem;
          margin-bottom: 1.35rem;
        }
        .hp-hero__found-link {
          font-size: 0.92rem;
          font-weight: 700;
          color: #A67C52;
          padding: 0.4rem 0.25rem;
          text-decoration: underline;
          text-underline-offset: 4px;
        }
        .hp-hero__found-link:hover {
          color: #896642;
        }

        .hp-hero__indicators {
          list-style: none;
          padding: 0;
          margin: 0 0 1.05rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem 1.15rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #3D3228;
        }
        .hp-hero__indicators li {
          display: inline-flex;
          align-items: center;
          gap: 0.38rem;
        }
        .hp-hero__indicators svg {
          color: #A67C52;
        }

        .hp-hero__portals {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding-top: 0.95rem;
          border-top: 1px solid #E3D8C9;
          max-width: 560px;
        }
        .hp-portal-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.34rem 0.78rem;
          border-radius: 999px;
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          color: #3D3228;
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.16s ease;
        }
        .hp-portal-chip:hover {
          border-color: #A67C52;
          background-color: #EDE4D8;
        }

        /* Hero Right Composition */
        .hp-hero__right {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          min-width: 0;
        }
        .hp-hero-float-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 0.5rem;
        }
        .hp-float-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.4rem 0.85rem;
          border-radius: 999px;
          background-color: #FFFDF8;
          border: 1px solid #C4A484;
          box-shadow: var(--shadow-sm);
          font-size: 0.74rem;
          font-weight: 700;
          color: #3D3228;
        }
        .hp-float-pill--outline {
          background-color: #EDE4D8;
          color: #896642;
        }
        .hp-float-pill__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #6F8B70;
          box-shadow: 0 0 0 3px rgba(111, 139, 112, 0.22);
        }

        .hp-comp-card {
          background-color: #FFFDF8;
          border: 1.5px solid #E3D8C9;
          border-radius: 20px;
          padding: clamp(0.9rem, 2vw, 1.35rem);
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .hp-comp-card__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          flex-wrap: wrap;
          padding-bottom: 0.65rem;
          border-bottom: 1px solid #E3D8C9;
        }
        .hp-comp-card__kicker {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #A67C52;
        }

        .hp-comp-pair {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 0.6rem;
        }
        .hp-comp-photo {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #E3D8C9;
          background-color: #F5F0E8;
          aspect-ratio: 4 / 3;
        }
        .hp-comp-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .hp-comp-scan {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #A67C52, #FFFDF8, #A67C52, transparent);
          opacity: 0;
          animation: hpScanBeam 2.8s ease-in-out infinite;
          animation-play-state: paused;
          transition: opacity 0.2s ease;
          z-index: 2;
        }
        .hp-hero__right:hover .hp-comp-scan,
        .hp-comp-card--animating .hp-comp-scan {
          opacity: 1;
          animation-play-state: running;
        }
        .hp-comp-scan--delay {
          animation-delay: 1.4s;
        }
        @keyframes hpScanBeam {
          0%, 100% { top: 8%; }
          50% { top: 88%; }
        }
        .hp-comp-tag {
          position: absolute;
          top: 0.4rem;
          left: 0.4rem;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 0.14rem 0.45rem;
          border-radius: 999px;
          z-index: 3;
        }
        .hp-comp-tag--lost {
          background-color: rgba(185, 107, 96, 0.92);
          color: #FFFDF8;
        }
        .hp-comp-tag--found {
          background-color: rgba(111, 139, 112, 0.92);
          color: #FFFDF8;
        }
        .hp-comp-photo small {
          position: absolute;
          bottom: 0.35rem;
          right: 0.35rem;
          background: rgba(61, 50, 40, 0.85);
          color: #FFFDF8;
          font-size: 0.6rem;
          font-family: monospace;
          padding: 0.1rem 0.38rem;
          border-radius: 4px;
        }

        .hp-comp-bridge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          min-width: 72px;
        }
        .hp-comp-line {
          position: relative;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, #B96B60, #A67C52, #6F8B70);
          border-radius: 999px;
        }
        .hp-comp-pulse {
          position: absolute;
          top: -3px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #FFFDF8;
          border: 2px solid #A67C52;
        }
        .hp-comp-orb {
          padding: 0.38rem 0.62rem;
          border-radius: 12px;
          background: linear-gradient(135deg, #A67C52, #896642);
          color: #FFFDF8;
          text-align: center;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 5px 14px rgba(137, 102, 66, 0.28);
        }
        .hp-comp-orb strong {
          font-family: var(--font-serif);
          font-size: 1rem;
          line-height: 1.05;
        }
        .hp-comp-orb span {
          font-size: 0.58rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .hp-belongings-section {
          padding-top: 0.7rem;
          border-top: 1px solid #E3D8C9;
        }
        .hp-belongings-section__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.72rem;
          font-weight: 700;
          color: #82776B;
          margin-bottom: 0.55rem;
          gap: 0.5rem;
        }
        .hp-belongings-section__head a {
          color: #A67C52;
        }
        .hp-belongings-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.45rem;
        }
        .hp-belonging-item {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.35rem 0.45rem;
          border-radius: 10px;
          background-color: #F5F0E8;
          border: 1px solid #E3D8C9;
          text-decoration: none;
          min-width: 0;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .hp-belonging-item:hover {
          border-color: #A67C52;
          transform: translateY(-1px);
        }
        .hp-belonging-item img {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .hp-belonging-item__txt {
          min-width: 0;
        }
        .hp-belonging-item strong {
          display: block;
          font-size: 0.69rem;
          color: #3D3228;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hp-belonging-item span {
          display: block;
          font-size: 0.61rem;
          color: #82776B;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* 5. Live Statistics (4 col desktop, 2 col tablet & >=360px mobile, 1 col <360px) */
        .hp-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
        }
        .hp-stat-card {
          padding: clamp(0.95rem, 2vw, 1.35rem);
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .hp-stat-card__icon {
          width: 40px;
          height: 40px;
          border-radius: 11px;
          background-color: rgba(166, 124, 82, 0.15);
          color: #896642;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.45rem;
        }
        .hp-stat-card__icon--sage {
          background-color: rgba(111, 139, 112, 0.16);
          color: #4D6A4E;
        }
        .hp-stat-card__icon--amber {
          background-color: rgba(196, 154, 82, 0.18);
          color: #8F611E;
        }
        .hp-stat-card__icon--tan {
          background-color: rgba(196, 164, 132, 0.24);
          color: #896642;
        }
        .hp-stat-card__label {
          font-size: 0.78rem;
          font-weight: 600;
          color: #82776B;
        }
        .hp-stat-card__val {
          font-family: var(--font-serif);
          font-size: clamp(1.65rem, 2.5vw, 2.2rem);
          line-height: 1.05;
          color: #3D3228;
        }
        .hp-stat-card__sub {
          font-size: 0.72rem;
          color: #82776B;
        }

        /* 6. How It Works */
        .hp-how-grid {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1.2rem;
        }
        .hp-how-card {
          position: relative;
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          border-radius: 16px;
          padding: 1.35rem;
          box-shadow: var(--shadow-sm);
        }
        .hp-how-card__connector {
          position: absolute;
          top: 2.3rem;
          right: -1.2rem;
          width: 1.2rem;
          height: 2px;
          background-color: #C4A484;
          z-index: 1;
        }
        .hp-how-card__top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.9rem;
        }
        .hp-how-card__num {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          font-weight: 700;
          color: #A67C52;
          background-color: #EDE4D8;
          padding: 0.15rem 0.65rem;
          border-radius: 999px;
        }
        .hp-how-card__icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background-color: #F5F0E8;
          border: 1px solid #E3D8C9;
          color: #896642;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hp-how-card h3 {
          font-size: 1.08rem;
          color: #3D3228;
          margin-bottom: 0.4rem;
        }
        .hp-how-card p {
          font-size: 0.86rem;
          color: #82776B;
          margin: 0;
        }

        /* 7. AI Technology Showcase */
        .hp-tech-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1.1rem;
        }
        .hp-tech-card {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .hp-tech-card__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.4rem;
          margin-bottom: 0.85rem;
        }
        .hp-tech-card h3 {
          font-size: 1.15rem;
          color: #3D3228;
          margin-bottom: 0.35rem;
        }
        .hp-tech-card p {
          font-size: 0.86rem;
          color: #82776B;
          margin: 0;
        }

        .hp-pipeline-box {
          margin-top: 1.75rem;
          padding: 1.2rem 1.35rem;
          border-radius: 16px;
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          box-shadow: var(--shadow-sm);
        }
        .hp-pipeline-box__title {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.76rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #896642;
          margin-bottom: 0.95rem;
        }
        .hp-pipeline-flow {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 0.55rem;
          align-items: stretch;
        }
        .hp-pipeline-node-wrap {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .hp-pipeline-node {
          flex: 1;
          padding: 0.75rem 0.85rem;
          border-radius: 12px;
          background-color: #F5F0E8;
          border: 1px solid #E3D8C9;
          height: 100%;
        }
        .hp-pipeline-node__num {
          display: inline-block;
          font-size: 0.68rem;
          font-weight: 700;
          color: #A67C52;
          margin-bottom: 0.15rem;
        }
        .hp-pipeline-node strong {
          display: block;
          font-size: 0.84rem;
          color: #3D3228;
          margin-bottom: 0.12rem;
        }
        .hp-pipeline-node small {
          display: block;
          font-size: 0.71rem;
          color: #82776B;
        }
        .hp-pipeline-arrow {
          color: #A67C52;
          font-weight: 700;
        }

        /* 8. Recent Items (4 col large desktop, 3 col std desktop, 2 col tablet, 1 col mobile) */
        .hp-cat-tabs {
          display: flex;
          gap: 0.45rem;
          flex-wrap: wrap;
          margin-bottom: 1.4rem;
        }
        .hp-cat-tab {
          display: inline-flex;
          align-items: center;
          gap: 0.38rem;
          padding: 0.45rem 0.9rem;
          border-radius: 999px;
          border: 1px solid #E3D8C9;
          background-color: #FFFDF8;
          color: #82776B;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          min-height: 40px;
          transition: all 0.16s ease;
        }
        .hp-cat-tab:hover {
          border-color: #A67C52;
          color: #3D3228;
        }
        .hp-cat-tab--active {
          background-color: #A67C52;
          border-color: #A67C52;
          color: #FFFDF8;
        }

        .hp-items-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1.1rem;
        }
        .hp-item-skeleton {
          height: 310px;
          border-radius: 16px;
          background: linear-gradient(90deg, #EDE4D8 25%, #FFFDF8 50%, #EDE4D8 75%);
          background-size: 200% 100%;
          animation: hpSkeleton 1.4s ease-in-out infinite;
          border: 1px solid #E3D8C9;
        }
        @keyframes hpSkeleton {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .hp-item-card {
          padding: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .hp-item-card__media {
          position: relative;
        }
        .hp-item-card__media .item-media {
          border-radius: 0;
          border: none;
          border-bottom: 1px solid #E3D8C9;
          aspect-ratio: 16 / 10;
        }
        .hp-item-card__badges {
          position: absolute;
          top: 0.65rem;
          left: 0.65rem;
          right: 0.65rem;
          display: flex;
          justify-content: space-between;
          gap: 0.35rem;
          flex-wrap: wrap;
        }
        .hp-item-card__body {
          padding: 1rem 1.1rem 1.15rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .hp-item-card__cat {
          font-size: 0.69rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #A67C52;
          margin-bottom: 0.25rem;
        }
        .hp-item-card__title {
          font-size: 1.05rem;
          margin-bottom: 0.55rem;
          line-height: 1.28;
        }
        .hp-item-card__title a {
          color: #3D3228;
        }
        .hp-item-card__meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.76rem;
          color: #82776B;
          margin-top: auto;
          padding-top: 0.65rem;
          border-top: 1px solid #E3D8C9;
          margin-bottom: 0.85rem;
        }
        .hp-item-card__meta span {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        /* 9. Live AI Match Showcase */
        .hp-match-showcase {
          background-color: #FFFDF8;
          border: 1.5px solid #E3D8C9;
          border-radius: 20px;
          padding: clamp(1.25rem, 3vw, 2.25rem);
          display: grid;
          grid-template-columns: 1.04fr 0.96fr;
          gap: 1.85rem;
          align-items: center;
          box-shadow: var(--shadow-md);
        }
        .hp-match-showcase__left h2 {
          font-size: clamp(1.45rem, 2.8vw, 2.05rem);
          margin-bottom: 0.55rem;
        }
        .hp-match-showcase__desc {
          font-size: 0.92rem;
          color: #82776B;
          margin-bottom: 1.2rem;
        }
        .hp-match-showcase__metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.65rem;
          margin-bottom: 1.3rem;
        }
        .hp-showcase-metric {
          padding: 0.7rem;
          border-radius: 12px;
          background-color: #F5F0E8;
          border: 1px solid #E3D8C9;
        }
        .hp-showcase-metric span {
          display: block;
          font-size: 0.7rem;
          color: #82776B;
        }
        .hp-showcase-metric strong {
          font-family: var(--font-serif);
          font-size: 1.35rem;
          color: #3D3228;
        }
        .hp-showcase-pair {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 0.65rem;
          align-items: center;
          padding: 0.95rem;
          border-radius: 16px;
          background-color: #F5F0E8;
          border: 1px solid #E3D8C9;
        }
        .hp-showcase-item {
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          border-radius: 12px;
          padding: 0.7rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          min-width: 0;
        }
        .hp-showcase-item img {
          width: 100%;
          height: 118px;
          object-fit: cover;
          border-radius: 8px;
        }
        .hp-showcase-item h4 {
          font-size: 0.85rem;
          margin: 0;
          color: #3D3228;
        }
        .hp-showcase-item span {
          font-size: 0.71rem;
          color: #82776B;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .hp-showcase-bridge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
        }
        .hp-showcase-bridge__line {
          width: 2px;
          height: 26px;
          background-color: #A67C52;
        }
        .hp-showcase-bridge__orb {
          padding: 0.42rem 0.58rem;
          border-radius: 12px;
          background-color: #A67C52;
          color: #FFFDF8;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .hp-showcase-bridge__orb strong {
          font-size: 0.9rem;
        }
        .hp-showcase-bridge__orb small {
          font-size: 0.58rem;
        }

        /* 10. Features Grid */
        .hp-features-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.2rem;
        }
        .hp-feature-card h3 {
          font-size: 1.15rem;
          color: #3D3228;
          margin-bottom: 0.4rem;
        }
        .hp-feature-card p {
          font-size: 0.88rem;
          color: #82776B;
          margin: 0;
        }

        /* 11. CTA Banner */
        .hp-cta-banner {
          background-color: #FFFDF8;
          border: 1px solid #E3D8C9;
          border-radius: 20px;
          padding: clamp(1.35rem, 3.5vw, 2.5rem);
          display: grid;
          grid-template-columns: 1.12fr 0.88fr;
          gap: 1.85rem;
          align-items: center;
          box-shadow: var(--shadow-md);
        }
        .hp-cta-banner h2 {
          font-size: clamp(1.65rem, 3.2vw, 2.35rem);
          margin-bottom: 0.65rem;
        }
        .hp-cta-banner p {
          margin-bottom: 1.4rem;
          color: #82776B;
        }
        .hp-cta-banner__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .hp-cta-banner__media {
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #E3D8C9;
        }
        .hp-cta-banner__media img {
          width: 100%;
          height: 260px;
          object-fit: cover;
          display: block;
        }

        /* Responsive Breakpoints covering 320px to 1920px */
        @media (max-width: 1279px) {
          .hp-items-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1023px) {
          .hp-how-grid,
          .hp-tech-grid,
          .hp-features-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .hp-how-card__connector {
            display: none;
          }
          .hp-pipeline-flow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .hp-pipeline-arrow {
            display: none;
          }
          .hp-items-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .hp-match-showcase,
          .hp-cta-banner {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 767px) {
          .hp-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .hp-belongings-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 579px) {
          .hp-how-grid,
          .hp-tech-grid,
          .hp-features-grid,
          .hp-pipeline-flow,
          .hp-items-grid,
          .hp-match-showcase__metrics,
          .hp-showcase-pair,
          .hp-comp-pair {
            grid-template-columns: 1fr;
          }
          .hp-comp-bridge,
          .hp-showcase-bridge {
            flex-direction: row;
            justify-content: center;
          }
          .hp-comp-line,
          .hp-showcase-bridge__line {
            width: 34px;
            height: 2px;
          }
          .hp-hero__ctas > a,
          .hp-cta-banner__actions > a {
            width: 100%;
          }
        }

        @media (max-width: 359px) {
          .hp-stats-grid,
          .hp-belongings-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
