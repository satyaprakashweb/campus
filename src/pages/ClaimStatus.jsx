import { useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, UserCheck, FileText, QrCode, ShieldAlert } from 'lucide-react';
import { usePortalData } from '../context/PortalDataContext';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Timeline from '../components/Timeline';
import EmptyState from '../components/EmptyState';

export default function ClaimStatus() {
  const { claimId } = useParams();
  const { claims, items } = usePortalData();

  const claim = claims.find((c) => c.id === claimId || c.claimCode === claimId);

  if (!claim) {
    return (
      <section className="section" style={{ paddingTop: 'calc(var(--navbar-height) + 3rem)' }}>
        <div className="container container--narrow">
          <EmptyState
            showIllustration
            title="Claim record not found"
            description="We could not locate a claim with that reference ID, or you may not have permission to view it."
            action={
              <Button to="/dashboard" variant="primary">
                <ArrowLeft size={16} aria-hidden="true" /> Back to My Dashboard
              </Button>
            }
          />
        </div>
      </section>
    );
  }

  const item = items.find((i) => i.id === claim.itemId);
  const stLower = String(claim.status || '').toLowerCase();
  const isVerified =
    stLower === 'approved' || stLower === 'verified' || stLower === 'returned';
  const isReturned =
    stLower === 'returned' ||
    claim.handover?.status === 'Completed' ||
    String(item?.status || '').toLowerCase() === 'returned';
  const isRejected = stLower === 'rejected';

  const steps = [
    {
      title: 'Ownership Claim Submitted',
      state: 'done',
      description: 'Claim submitted with private identifying evidence and unique features.',
      meta: `Submitted on ${new Date(claim.submittedAt).toLocaleString()} (${claim.claimCode || claim.id})`,
    },
    {
      title: 'Administrative Verification',
      state: isVerified ? 'done' : isRejected ? 'done' : 'active',
      description: isRejected
        ? `Administrator decision: ${claim.adminReason || 'Claim not verified.'}`
        : isVerified
        ? `Evidence verified by ${claim.verifiedBy || 'Administrator'}.`
        : 'A campus administrator is reviewing your identification details and supporting proof.',
      meta: isVerified
        ? 'Verification completed'
        : isRejected
        ? 'Claim rejected'
        : 'Pending review',
    },
    {
      title: 'Claim Approved & Handover Scheduled',
      state: isVerified ? 'done' : 'upcoming',
      description: isVerified
        ? claim.handover
          ? `Handover ${claim.handover.handoverCode || ''} (${claim.handover.status}) at ${claim.handover.location}.`
          : 'Ownership confirmed. Ready for campus handover.'
        : 'Awaiting administrative approval.',
      meta: claim.verifiedAt
        ? `Reviewed on ${new Date(claim.verifiedAt).toLocaleString()} by ${claim.verifiedBy || 'Administrator'}`
        : undefined,
    },
    {
      title: 'Physical Handover & Returned',
      state: isReturned ? 'done' : isVerified ? 'active' : 'upcoming',
      description: isReturned
        ? 'Item physically handed over, verified with campus ID, and logged as Returned.'
        : 'Present your campus ID and verification token at the Student Services Office to complete handover.',
      details: claim.handover ? (
        <div className="handover-box">
          <div className="handover-box__row">
            <span><QrCode size={14} aria-hidden="true" /> Handover &amp; QR Verification Code</span>
            <strong>
              {claim.handover.handoverCode || 'HND'} · <code>{claim.handover.qrToken || 'VERIFIED'}</code>
            </strong>
          </div>
          <div className="handover-box__row">
            <span><Calendar size={14} aria-hidden="true" /> Handover Date &amp; Time</span>
            <strong>
              {claim.handover.date || claim.handover.scheduledDate}{' '}
              {claim.handover.time ? `at ${claim.handover.time}` : ''} ({claim.handover.status})
            </strong>
          </div>
          <div className="handover-box__row">
            <span><MapPin size={14} aria-hidden="true" /> Handover Location</span>
            <strong>{claim.handover.location || 'Student Services Office, OUTR, Bhubaneswar'}</strong>
          </div>
          <div className="handover-box__row">
            <span><UserCheck size={14} aria-hidden="true" /> Recorded By</span>
            <strong>{claim.handover.recordedBy || 'OUTR Campus Administrator'}</strong>
          </div>
          {claim.handover.notes && (
            <div className="handover-box__row">
              <span><FileText size={14} aria-hidden="true" /> Administrative Remarks</span>
              <strong>{claim.handover.notes}</strong>
            </div>
          )}
        </div>
      ) : null,
    },
  ];

  return (
    <div>
      <section className="page-header">
        <div className="container">
          <span className="eyebrow">Claim Status &amp; Handover Tracker</span>
          <h1>{item?.title || `Claim ${claim.claimCode || claim.id}`}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center', marginTop: '0.6rem' }}>
            <Badge status={isReturned ? 'Returned' : claim.status} />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--mocha-600)' }}>
              Reference: <strong>{claim.claimCode || claim.id}</strong>
            </span>
          </div>
        </div>
      </section>

      <section className="section section--compact">
        <div className="container container--narrow">
          <div style={{ marginBottom: '1.25rem' }}>
            <Button to="/dashboard" variant="ghost" size="sm">
              <ArrowLeft size={15} aria-hidden="true" /> Back to My Dashboard
            </Button>
          </div>

          {isRejected && claim.adminReason && (
            <div className="alert alert--danger" role="alert" style={{ marginBottom: '1.5rem' }}>
              <ShieldAlert size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Claim Not Approved</strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: 'var(--text-xs)', color: 'inherit' }}>
                  Administrator explanation: {claim.adminReason}
                </p>
              </div>
            </div>
          )}

          <div className="claim-status-layout">
            <Card>
              <span className="eyebrow">Verification &amp; Handover Progress</span>
              <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: '1.5rem' }}>
                Claim Lifecycle Timeline
              </h2>
              <Timeline steps={steps} />
            </Card>

            <Card sand>
              <span className="eyebrow">Submitted Claim Evidence</span>
              <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: '1rem' }}>
                Identification Details
              </h2>
              <p style={{ color: 'var(--mocha-900)', fontSize: 'var(--text-sm)', marginBottom: '0.85rem' }}>
                {claim.identifyingDetails}
              </p>
              {claim.uniqueFeatures && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-900)', marginBottom: '0.85rem' }}>
                  <strong>Unique Features:</strong> {claim.uniqueFeatures}
                </p>
              )}
              {claim.claimReason && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)', marginBottom: '0.85rem' }}>
                  <strong>Claim Reason:</strong> {claim.claimReason}
                </p>
              )}
              {claim.proofPhoto && (
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Uploaded Supporting Proof
                  </span>
                  <img
                    src={claim.proofPhoto}
                    alt="Supporting ownership proof"
                    style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--sand-300)', maxHeight: '160px', objectFit: 'cover' }}
                  />
                </div>
              )}
              <hr className="divider" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--text-sm)' }}>
                <div>
                  <span style={{ color: 'var(--mocha-600)' }}>Claimant: </span>
                  <strong>{claim.claimantName || 'Campus Member'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--mocha-600)' }}>Contact: </span>
                  <strong>{claim.contact || 'On file'}</strong>
                </div>
                {item && (
                  <div>
                    <span style={{ color: 'var(--mocha-600)' }}>Item Location: </span>
                    <strong>{item.location}</strong>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </section>

      <style>{`
        .claim-status-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        @media (min-width: 900px) {
          .claim-status-layout {
            grid-template-columns: 1.35fr 0.85fr;
          }
        }

        .handover-box {
          background-color: var(--cream-100);
          border: 1px solid var(--sand-300);
          border-radius: var(--radius-md);
          padding: 0.9rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .handover-box__row {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          font-size: var(--text-xs);
        }

        .handover-box__row span {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          color: var(--mocha-600);
        }

        .handover-box__row strong {
          color: var(--mocha-900);
          font-size: var(--text-sm);
        }
      `}</style>
    </div>
  );
}
