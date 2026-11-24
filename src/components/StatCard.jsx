import { useReducedMotion } from 'framer-motion';
import { useAnimatedCounter } from './AnimatedPhotoMatcher';

/**
 * Reusable StatCard component with animated number counting for database statistics.
 */
export default function StatCard({ icon: Icon, label, value = '—', note, suffix = '' }) {
  const prefersReducedMotion = useReducedMotion();
  const isNumeric = typeof value === 'number' && !Number.isNaN(value);
  const animatedNumber = useAnimatedCounter(
    isNumeric ? value : 0,
    isNumeric,
    Boolean(prefersReducedMotion),
    750
  );

  return (
    <div className="stat-card">
      <div className="stat-card__top">
        {Icon && (
          <div className="stat-card__icon" aria-hidden="true">
            <Icon size={20} />
          </div>
        )}
      </div>
      <div className="stat-card__value">
        {isNumeric ? `${animatedNumber}${suffix}` : value}
      </div>
      <div className="stat-card__label">{label}</div>
      {note && <div className="stat-card__note">{note}</div>}
    </div>
  );
}
