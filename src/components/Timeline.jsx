import { Check, Clock } from 'lucide-react';

/**
 * Reusable vertical Timeline component for claim verification and handover tracking.
 */
export default function Timeline({ steps = [] }) {
  return (
    <ol className="timeline" aria-label="Progress timeline">
      {steps.map((step, index) => {
        const dotClass =
          step.state === 'done'
            ? 'timeline__dot timeline__dot--done'
            : step.state === 'active'
            ? 'timeline__dot timeline__dot--active'
            : 'timeline__dot';

        return (
          <li key={step.title || index} className="timeline__step">
            <span className={dotClass} aria-hidden="true">
              {step.state === 'done' && <Check size={13} strokeWidth={2.75} />}
              {step.state === 'active' && <Clock size={12} strokeWidth={2.5} />}
            </span>
            <p className="timeline__title">{step.title}</p>
            {step.description && <p className="timeline__meta">{step.description}</p>}
            {step.meta && (
              <p
                className="timeline__meta"
                style={{ fontSize: 'var(--text-xs)', color: 'var(--bronze-700)', marginTop: '0.25rem' }}
              >
                {step.meta}
              </p>
            )}
            {step.details && <div style={{ marginTop: '0.6rem' }}>{step.details}</div>}
          </li>
        );
      })}
    </ol>
  );
}
