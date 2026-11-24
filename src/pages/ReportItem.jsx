import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Sparkles, ArrowRight, Eye } from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import FileDropzone from '../components/FileDropzone';
import AnimatedPhotoMatcher from '../components/AnimatedPhotoMatcher';

const MAX_DESC = 600;

function extractInitialPhotos(item) {
  if (!item) return [];
  if (Array.isArray(item.photos) && item.photos.length > 0) {
    return item.photos.map((url, idx) => ({
      id: `init-${idx}`,
      name: `Photograph ${idx + 1}`,
      previewUrl: url,
    }));
  }
  if (item.photo) {
    return [{ id: 'init-0', name: 'Current photograph', previewUrl: item.photo }];
  }
  return [];
}

export default function ReportItem() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = searchParams.get('edit');
  const initialType = searchParams.get('type') === 'found' ? 'found' : 'lost';
  const prefillCat = searchParams.get('category') || '';
  const prefillLoc = searchParams.get('location') || '';

  const { items, categories, locations, addItem, updateItem } = usePortalData();
  const editingItem = editId ? items.find((i) => i.id === editId) : null;

  const [type, setType] = useState(editingItem?.type || initialType);
  const [title, setTitle] = useState(editingItem?.title || '');
  const [category, setCategory] = useState(editingItem?.category || prefillCat);
  const [description, setDescription] = useState(editingItem?.description || '');
  const [color, setColor] = useState(editingItem?.color || '');
  const [brand, setBrand] = useState(editingItem?.brand || '');
  const [date, setDate] = useState(
    () => editingItem?.date || new Date().toISOString().split('T')[0]
  );
  const [time, setTime] = useState(editingItem?.time || '');
  const [location, setLocation] = useState(editingItem?.location || prefillLoc);
  const [distinguishingFeatures, setDistinguishingFeatures] = useState(
    editingItem?.distinguishingFeatures || ''
  );
  const [additionalInfo, setAdditionalInfo] = useState(editingItem?.additionalInfo || '');
  const [photos, setPhotos] = useState(() => extractInitialPhotos(editingItem));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedItem, setSubmittedItem] = useState(null);

  useEffect(() => {
    if (editingItem) {
      setType(editingItem.type);
      setTitle(editingItem.title || '');
      setCategory(editingItem.category || '');
      setDescription(editingItem.description || '');
      setColor(editingItem.color || '');
      setBrand(editingItem.brand || '');
      setDate(editingItem.date || new Date().toISOString().split('T')[0]);
      setTime(editingItem.time || '');
      setLocation(editingItem.location || '');
      setDistinguishingFeatures(editingItem.distinguishingFeatures || '');
      setAdditionalInfo(editingItem.additionalInfo || '');
      setPhotos(extractInitialPhotos(editingItem));
    }
  }, [editingItem]);

  const clearError = (key) => {
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors = {};
    if (!title.trim() || title.trim().length < 4) {
      nextErrors.title = 'Enter a clear item name (at least 4 characters).';
    }
    if (!category) nextErrors.category = 'Select an item category.';
    if (!description.trim() || description.trim().length < 15) {
      nextErrors.description =
        'Provide a detailed description (at least 15 characters) so automatic AI matching can compare reports accurately.';
    }
    if (!color.trim()) nextErrors.color = 'Specify the primary item color.';
    if (!location) nextErrors.location = 'Select the campus location.';
    if (!date) nextErrors.date = `Select the ${type === 'lost' ? 'lost' : 'found'} date.`;

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setServerError('');

      const photoUrls = (Array.isArray(photos) ? photos : [photos])
        .map((p) => (typeof p === 'string' ? p : p?.previewUrl))
        .filter(Boolean);

      if (editingItem) {
        await updateItem(editingItem.id, {
          title: title.trim(),
          category,
          description: description.trim(),
          color: color.trim(),
          brand: brand.trim(),
          location,
          distinguishingFeatures: distinguishingFeatures.trim(),
          photo: photoUrls[0] || null,
          photos: photoUrls,
        });
        navigate(`/items/${editingItem.id}`);
        return;
      }

      const { item, matchCount, matches = [] } = await addItem({
        type,
        title: title.trim(),
        category,
        description: description.trim(),
        color: color.trim(),
        brand: brand.trim(),
        date,
        time,
        location,
        distinguishingFeatures: distinguishingFeatures.trim(),
        additionalInfo: additionalInfo.trim(),
        photo: photoUrls[0] || null,
        photos: photoUrls,
      });

      setSubmittedItem({ ...item, matchCount, matches });
    } catch (err) {
      setServerError(err.message || 'Could not submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setColor('');
    setBrand('');
    setLocation('');
    setTime('');
    setDistinguishingFeatures('');
    setAdditionalInfo('');
    setPhotos([]);
    setErrors({});
    setServerError('');
    setSubmittedItem(null);
  };

  const topTriggeredMatch = submittedItem?.matches?.[0] || null;

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <span className="eyebrow">
            {editingItem ? `Edit Report · ${editingItem.reportCode || editingItem.id}` : 'Campus Reporting Module'}
          </span>
          <h1>
            {editingItem
              ? `Update ${editingItem.type === 'lost' ? 'Lost' : 'Found'} Item Report`
              : type === 'lost'
              ? 'Report a Lost Item'
              : 'Report a Found Item'}
          </h1>
          <p className="page-header__lead">
            Provide item attributes, color, brand, campus location, distinguishing features, and photographs.
            Our Multimodal AI engine combines CLIP ViT-B/32 visual embeddings with Sentence-BERT and TF-IDF.
          </p>
        </div>
      </section>

      <section className="section section--compact">
        <div className="container" style={{ maxWidth: submittedItem ? '960px' : '820px' }}>
          {submittedItem ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <Card className="report-success" role="status">
                <div className="report-success__icon" aria-hidden="true">
                  <CheckCircle2 size={36} />
                </div>
                <span className="eyebrow">
                  Report Saved · {submittedItem.reportCode || submittedItem.id}
                </span>
                <h2 style={{ fontSize: 'var(--text-3xl)', marginBottom: '0.6rem' }}>
                  Your {submittedItem.type} item report is active
                </h2>
                <p style={{ maxWidth: '580px', margin: '0 auto 1.5rem' }}>
                  <strong>"{submittedItem.title}"</strong> ({submittedItem.reportCode}) has been saved
                  to the database with status <strong>{submittedItem.status}</strong>.{' '}
                  {submittedItem.matchCount > 0
                    ? `Our Multimodal AI engine (CLIP + Sentence-BERT + TF-IDF) identified ${
                        submittedItem.matchCount
                      } potential opposite-type match${
                        submittedItem.matchCount === 1 ? '' : 'es'
                      } and sent notifications.`
                    : 'We will notify you automatically as soon as a matching report is submitted.'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                  <Button to={`/matches/${submittedItem.id}`} variant="primary" size="lg">
                    <Sparkles size={16} aria-hidden="true" /> View AI Matches ({submittedItem.matchCount})
                  </Button>
                  {topTriggeredMatch && (
                    <Button
                      to={`/photo-match/${encodeURIComponent(topTriggeredMatch.id)}`}
                      variant="secondary"
                      size="lg"
                    >
                      <Eye size={16} aria-hidden="true" /> Open Photo Comparison
                    </Button>
                  )}
                  <Button to={`/items/${submittedItem.id}`} variant="secondary" size="lg">
                    View Report Details
                  </Button>
                  <Button to="/dashboard" variant="secondary" size="lg">
                    My Dashboard
                  </Button>
                  <Button variant="ghost" onClick={resetForm}>
                    Submit Another Report
                  </Button>
                </div>
              </Card>

              {/* Animated AI Photo Matching Sequence when a potential match is found */}
              {topTriggeredMatch && (
                <AnimatedPhotoMatcher
                  match={topTriggeredMatch}
                  candidateItems={items}
                  autoPlay={true}
                  initialStage={0}
                />
              )}
            </div>
          ) : (
            <Card>
              {serverError && (
                <div className="alert alert--danger" role="alert" style={{ marginBottom: '1.25rem' }}>
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {!editingItem && (
                  <div className="form-group">
                    <span className="form-label form-label--required" id="report-type-label">
                      Report Module
                    </span>
                    <div
                      className="toggle-group"
                      style={{ width: '100%' }}
                      role="group"
                      aria-labelledby="report-type-label"
                    >
                      <button
                        type="button"
                        className={`toggle-group__btn ${type === 'lost' ? 'toggle-group__btn--active' : ''}`}
                        onClick={() => setType('lost')}
                        aria-pressed={type === 'lost'}
                      >
                        Lost Item Report
                      </button>
                      <button
                        type="button"
                        className={`toggle-group__btn ${type === 'found' ? 'toggle-group__btn--active' : ''}`}
                        onClick={() => setType('found')}
                        aria-pressed={type === 'found'}
                      >
                        Found Item Report
                      </button>
                    </div>
                  </div>
                )}

                <div className="report-grid">
                  <Input
                    id="report-title"
                    label="Item Name"
                    required
                    maxLength={100}
                    showCount
                    placeholder={
                      type === 'lost'
                        ? 'e.g., Black Leather Wallet with College ID'
                        : 'e.g., Found Android Smartphone in Navy Case'
                    }
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      clearError('title');
                    }}
                    error={errors.title}
                  />

                  <Select
                    id="report-category"
                    label="Item Category"
                    required
                    placeholder="Select category"
                    options={categories.map((c) => ({ value: c.id, label: c.label }))}
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      clearError('category');
                    }}
                    error={errors.category}
                  />
                </div>

                <Input
                  id="report-description"
                  label="Detailed Description"
                  multiline
                  required
                  maxLength={MAX_DESC}
                  showCount
                  rows={4}
                  placeholder="Describe the item's appearance, condition, where it was last seen or picked up, and surrounding context..."
                  hint="Both TF-IDF and Sentence-BERT use this description alongside CLIP image embeddings and contextual metadata."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    clearError('description');
                  }}
                  error={errors.description}
                />

                <div className="report-grid">
                  <Input
                    id="report-color"
                    label="Item Color"
                    required
                    placeholder="e.g., Black, Navy Blue, Charcoal Grey"
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      clearError('color');
                    }}
                    error={errors.color}
                  />

                  <Input
                    id="report-brand"
                    label="Brand / Make (Optional)"
                    placeholder="e.g., Samsung, Wildcraft, Casio, Titan"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>

                <div className="report-grid">
                  <Select
                    id="report-location"
                    label={type === 'lost' ? 'Campus Location (Last Seen)' : 'Found Location'}
                    required
                    placeholder="Select campus location"
                    options={locations}
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      clearError('location');
                    }}
                    error={errors.location}
                  />

                  <div className="report-grid" style={{ marginBottom: 0 }}>
                    <Input
                      id="report-date"
                      label={type === 'lost' ? 'Lost Date' : 'Found Date'}
                      type="date"
                      required
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        clearError('date');
                      }}
                      error={errors.date}
                    />

                    <Input
                      id="report-time"
                      label="Approx. Time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>

                <Input
                  id="report-features"
                  label="Distinguishing Features"
                  placeholder={
                    type === 'lost'
                      ? 'e.g., Pastel index tabs on chapters 6 & 15, brass lanyard clasp, small scuff near camera'
                      : 'e.g., Blue lanyard strap, colored page tabs (do not reveal private serials or PINs)'
                  }
                  value={distinguishingFeatures}
                  onChange={(e) => setDistinguishingFeatures(e.target.value)}
                />

                <Input
                  id="report-additional"
                  label={type === 'lost' ? 'Additional Information (Optional)' : 'Additional Notes / Where Deposited'}
                  placeholder={
                    type === 'lost'
                      ? 'Any extra context about when or how it was misplaced'
                      : 'e.g., Deposited at Student Services Office counter / Library desk'
                  }
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                />

                <FileDropzone
                  id="report-photos"
                  label="Item Photographs (Multi-Photo Upload, Preview, Remove & Replace)"
                  hint="Upload up to 4 photographs (JPG, JPEG, PNG, or WEBP up to 5 MB each). CLIP ViT-B/32 automatically generates visual embeddings for multimodal matching."
                  multiple={true}
                  maxFiles={4}
                  value={photos}
                  onChange={setPhotos}
                />

                <div className="report-submit-row">
                  <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
                    {isSubmitting
                      ? 'Generating CLIP Embeddings & Running Matcher...'
                      : editingItem
                      ? 'Save Report Changes'
                      : `Submit ${type === 'lost' ? 'Lost' : 'Found'} Report & Run AI Match`}{' '}
                    <ArrowRight size={17} aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </section>

      <style>{`
        .report-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0 1.15rem;
        }

        @media (min-width: 640px) {
          .report-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .report-submit-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .report-success {
          text-align: center;
          padding: clamp(2rem, 5vw, 2.75rem);
        }

        .report-success__icon {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background-color: var(--verified-bg);
          color: var(--verified-text);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem;
        }
      `}</style>
    </div>
  );
}
