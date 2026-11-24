import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, MapPin, Calendar, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortalData } from '../context/PortalDataContext';
import { getCategoryLabel } from '../data/mockData';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Input from '../components/Input';
import FileDropzone from '../components/FileDropzone';
import EmptyState from '../components/EmptyState';
import ItemImage from '../components/ItemImage';

export default function ClaimForm() {
  const { itemId } = useParams();
  const [searchParams] = useSearchParams();
  const linkedLostId = searchParams.get('lostItemId') || null;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, submitClaim } = usePortalData();

  const item = items.find((i) => i.id === itemId);

  const [claimantName, setClaimantName] = useState(user?.name || '');
  const [identifyingDetails, setIdentifyingDetails] = useState('');
  const [uniqueFeatures, setUniqueFeatures] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [supportingInfo, setSupportingInfo] = useState('');
  const [claimReason, setClaimReason] = useState('');
  const [contact, setContact] = useState(user?.email || '');
  const [proofPhoto, setProofPhoto] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdClaim, setCreatedClaim] = useState(null);

  if (!item) {
    return (
      <section className="section" style={{ paddingTop: 'calc(var(--navbar-height) + 3rem)' }}>
        <div className="container container--narrow">
          <EmptyState
            showIllustration
            title="Item not found"
            description="The item you attempted to claim could not be found."
            action={
              <Button to="/browse" variant="primary">
                <ArrowLeft size={16} aria-hidden="true" /> Browse Items
              </Button>
            }
          />
        </div>
      </section>
    );
  }

  const clearError = (key) => {
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!claimantName.trim()) nextErrors.claimantName = 'Claimant name is required.';
    if (!identifyingDetails.trim() || identifyingDetails.trim().length < 15) {
      nextErrors.identifyingDetails =
        'Provide specific identification details (at least 15 characters) to help the administrator verify ownership.';
    }
    if (!uniqueFeatures.trim()) {
      nextErrors.uniqueFeatures = 'Describe at least one unique identifying feature or mark.';
    }
    if (!claimReason.trim()) {
      nextErrors.claimReason = 'Briefly explain when and how you lost this item.';
    }
    if (!contact.trim()) {
      nextErrors.contact = 'Provide a valid campus email or phone number.';
    }
    if (!acknowledged) {
      nextErrors.acknowledged = 'You must acknowledge the ownership verification declaration.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setServerError('');
      const claim = await submitClaim({
        itemId: item.id,
        foundItemId: item.id,
        lostItemId: linkedLostId,
        claimantName: claimantName.trim(),
        identificationDetails: identifyingDetails.trim(),
        uniqueFeatures: uniqueFeatures.trim(),
        purchaseDate,
        supportingInfo: supportingInfo.trim(),
        claimReason: claimReason.trim(),
        contact: contact.trim(),
        proofPhoto: proofPhoto?.previewUrl || null,
      });
      setCreatedClaim(claim);
    } catch (err) {
      setServerError(err.message || 'Could not submit ownership claim.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <span className="eyebrow">Ownership Verification Process</span>
          <h1>Submit an Ownership Claim</h1>
          <p className="page-header__lead">
            Provide private identifying evidence so a campus administrator can verify your ownership
            before scheduling physical handover.
          </p>
        </div>
      </section>

      <section className="section section--compact">
        <div className="container" style={{ maxWidth: '780px' }}>
          {createdClaim ? (
            <Card style={{ textAlign: 'center', padding: 'clamp(2rem, 5vw, 3.25rem)' }} role="status">
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  backgroundColor: 'var(--verified-bg)',
                  color: 'var(--verified-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}
                aria-hidden="true"
              >
                <CheckCircle2 size={36} />
              </div>
              <span className="eyebrow">
                Claim Recorded · {createdClaim.claimCode || createdClaim.id}
              </span>
              <h2 style={{ fontSize: 'var(--text-3xl)', marginBottom: '0.65rem' }}>
                Your claim is Pending Verification
              </h2>
              <p style={{ maxWidth: '500px', margin: '0 auto 1.75rem' }}>
                Claim reference <strong>{createdClaim.claimCode || createdClaim.id}</strong> for{' '}
                <strong>"{item.title}"</strong> has been stored in the database and sent to the
                administrator verification queue.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                <Button to={`/claims/${createdClaim.id}`} variant="primary" size="lg">
                  Track Claim Status
                </Button>
                <Button to="/dashboard" variant="secondary" size="lg">
                  Return to Dashboard
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Item being claimed */}
              <Card sand compact style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <ItemImage item={item} variant="thumb" large eager />
                  <div style={{ minWidth: 0 }}>
                    <span className="eyebrow" style={{ marginBottom: '0.4rem' }}>
                      Target Found Report · {item.reportCode || item.id}
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.45rem' }}>
                      <Badge status={item.type} />
                      <Badge status={item.status} />
                      <Badge variant="neutral">{getCategoryLabel(item.category)}</Badge>
                    </div>
                    <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: '0.35rem' }}>{item.title}</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem 1.25rem', fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <MapPin size={13} aria-hidden="true" /> {item.location}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={13} aria-hidden="true" /> {item.date}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                {serverError && (
                  <div className="alert alert--danger" role="alert" style={{ marginBottom: '1.25rem' }}>
                    {serverError}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="claim-grid">
                    <Input
                      id="claim-name"
                      label="Claimant Full Name"
                      required
                      value={claimantName}
                      onChange={(e) => {
                        setClaimantName(e.target.value);
                        clearError('claimantName');
                      }}
                      error={errors.claimantName}
                    />

                    <Input
                      id="claim-report-code"
                      label="Item Report ID"
                      value={item.reportCode || item.id}
                      disabled
                    />
                  </div>

                  <Input
                    id="claim-details"
                    label="Item Identification Details"
                    multiline
                    required
                    maxLength={500}
                    showCount
                    rows={4}
                    placeholder="Describe private details only the owner would know: serial numbers, IMEI last digits, student ID number, lock screen wallpaper, or bag contents..."
                    hint="Encrypted in transit and visible only to you and the verifying administrator."
                    value={identifyingDetails}
                    onChange={(e) => {
                      setIdentifyingDetails(e.target.value);
                      clearError('identifyingDetails');
                    }}
                    error={errors.identifyingDetails}
                  />

                  <Input
                    id="claim-unique-features"
                    label="Unique Identifying Features / Marks"
                    required
                    placeholder="e.g., Stitched initials S.S.S inside front zip pocket, brass lanyard clasp, scratch near camera ring"
                    value={uniqueFeatures}
                    onChange={(e) => {
                      setUniqueFeatures(e.target.value);
                      clearError('uniqueFeatures');
                    }}
                    error={errors.uniqueFeatures}
                  />

                  <div className="claim-grid">
                    <Input
                      id="claim-purchase-date"
                      label="Approx. Purchase / Issue Date (Optional)"
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                    />

                    <Input
                      id="claim-contact"
                      label="Contact Email or Phone"
                      required
                      placeholder="name@university.edu or phone"
                      value={contact}
                      onChange={(e) => {
                        setContact(e.target.value);
                        clearError('contact');
                      }}
                      error={errors.contact}
                    />
                  </div>

                  <Input
                    id="claim-reason"
                    label="Reason for Ownership Claim (Where & How Lost)"
                    required
                    placeholder="e.g., Left on corner table in Central Cafeteria after lunch on Nov 17"
                    value={claimReason}
                    onChange={(e) => {
                      setClaimReason(e.target.value);
                      clearError('claimReason');
                    }}
                    error={errors.claimReason}
                  />

                  <Input
                    id="claim-supporting"
                    label="Additional Supporting Information (Optional)"
                    placeholder="e.g., Invoice number, linked lost report code, or witness details"
                    value={supportingInfo}
                    onChange={(e) => setSupportingInfo(e.target.value)}
                  />

                  <FileDropzone
                    id="claim-proof-upload"
                    label="Optional Proof Document or Photograph (Receipt, Old Photo, ID Proof)"
                    value={proofPhoto}
                    onChange={setProofPhoto}
                  />

                  <div className="form-group">
                    <label className="claim-ack">
                      <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(e) => {
                          setAcknowledged(e.target.checked);
                          clearError('acknowledged');
                        }}
                      />
                      <span>
                        I declare that I am the rightful owner of this item and understand that I
                        must present my official campus identification during in-person handover
                        verification at the Student Services Office.
                      </span>
                    </label>
                    {errors.acknowledged && (
                      <p className="form-error" role="alert">
                        {errors.acknowledged}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.25rem' }}>
                    <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
                      <ShieldCheck size={17} aria-hidden="true" />{' '}
                      {isSubmitting ? 'Submitting Claim...' : 'Submit Ownership Claim'}
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
            </>
          )}
        </div>
      </section>

      <style>{`
        .claim-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0 1.25rem;
        }

        @media (min-width: 640px) {
          .claim-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .claim-ack {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          font-size: var(--text-sm);
          color: var(--mocha-600);
          cursor: pointer;
          padding: 0.85rem;
          background-color: var(--cream-100);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
        }

        .claim-ack input {
          width: 18px;
          height: 18px;
          margin-top: 3px;
          flex-shrink: 0;
          accent-color: var(--mocha-900);
        }
      `}</style>
    </div>
  );
}
