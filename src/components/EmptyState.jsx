import { SearchX } from 'lucide-react';

/**
 * Friendly EmptyState component with warm editorial SVG illustration.
 */
export default function EmptyState({
  icon: Icon = SearchX,
  title = 'Nothing here yet',
  description = 'Try adjusting your filters or come back later.',
  action,
  showIllustration = false,
}) {
  return (
    <div className="empty-state" role="status">
      {showIllustration ? (
        <div style={{ maxWidth: '160px', margin: '0 auto 1.25rem' }} aria-hidden="true">
          <svg viewBox="0 0 180 130" fill="none" xmlns="http://www.w3.org/2000/svg" width="160" height="116">
            <rect x="18" y="24" width="110" height="82" rx="14" fill="#F3EBDD" stroke="#E8DCC8" strokeWidth="2" />
            <rect x="34" y="44" width="58" height="8" rx="4" fill="#E8DCC8" />
            <rect x="34" y="60" width="76" height="8" rx="4" fill="#E8DCC8" />
            <rect x="34" y="76" width="44" height="8" rx="4" fill="#E8DCC8" />
            <circle cx="122" cy="76" r="28" fill="#FFFDF8" stroke="#7A5C36" strokeWidth="2.5" />
            <path d="M142 96L158 112" stroke="#7A5C36" strokeWidth="4" strokeLinecap="round" />
            <circle cx="122" cy="76" r="14" stroke="#B8A48A" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
        </div>
      ) : (
        <div className="empty-state__icon" aria-hidden="true">
          <Icon size={32} />
        </div>
      )}
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__text">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
