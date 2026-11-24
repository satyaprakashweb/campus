const STATUS_MAP = {
  lost: { label: 'Lost', variant: 'lost' },
  found: { label: 'Found', variant: 'found' },
  active: { label: 'Active', variant: 'found' },
  matched: { label: 'Matched', variant: 'matched' },
  'potential match found': { label: 'Potential Match Found', variant: 'matched' },
  'claim-pending': { label: 'Claim Pending', variant: 'claim-pending' },
  'claim pending': { label: 'Claim Pending', variant: 'claim-pending' },
  pending: { label: 'Pending', variant: 'claim-pending' },
  'under review': { label: 'Under Review', variant: 'matched' },
  verified: { label: 'Verified', variant: 'verified' },
  approved: { label: 'Approved', variant: 'verified' },
  returned: { label: 'Returned', variant: 'returned' },
  resolved: { label: 'Resolved', variant: 'verified' },
  completed: { label: 'Completed', variant: 'verified' },
  scheduled: { label: 'Scheduled', variant: 'claim-pending' },
  rescheduled: { label: 'Rescheduled', variant: 'matched' },
  closed: { label: 'Closed', variant: 'neutral' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
  rejected: { label: 'Rejected', variant: 'rejected' },
  relevant: { label: 'Relevant Match', variant: 'verified' },
  not_my_item: { label: 'Not My Item', variant: 'neutral' },
  incorrect: { label: 'Incorrect Match', variant: 'rejected' },
  student: { label: 'Student', variant: 'student' },
  faculty: { label: 'Faculty', variant: 'staff' },
  staff: { label: 'Staff', variant: 'staff' },
  admin: { label: 'Administrator', variant: 'admin' },
};

/**
 * Reusable Badge component for item statuses, claim statuses, handover statuses, roles, and tags.
 */
export default function Badge({ status, variant, children, className = '' }) {
  const mapped = status ? STATUS_MAP[String(status).toLowerCase()] : null;
  const resolvedVariant = variant || mapped?.variant || 'neutral';
  const content = children || mapped?.label || status;

  return (
    <span className={`badge badge--${resolvedVariant} ${className}`.trim()}>
      {content}
    </span>
  );
}
