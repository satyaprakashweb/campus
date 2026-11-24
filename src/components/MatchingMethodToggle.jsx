import { Sparkles, FileSearch } from 'lucide-react';

const METHODS = [
  {
    id: 'sbert',
    label: 'Sentence-BERT',
    subtitle: 'Semantic meaning & concept similarity',
    icon: Sparkles,
  },
  {
    id: 'tfidf',
    label: 'TF-IDF Cosine',
    subtitle: 'Keyword frequency cosine baseline',
    icon: FileSearch,
  },
];

/**
 * Responsive selector for switching between Sentence-BERT and TF-IDF Cosine matching.
 * - variant="cards": spacious two-column card toggle (stacks on phones, 2-up on 540px+)
 * - variant="compact": compact pill toggle for section headers (wraps cleanly on 360px)
 */
export default function MatchingMethodToggle({
  value = 'sbert',
  onChange,
  variant = 'compact',
  labelId = 'matching-method-label',
}) {
  if (variant === 'cards') {
    return (
      <div className="method-cards" role="group" aria-labelledby={labelId}>
        {METHODS.map((method) => {
          const Icon = method.icon;
          const active = value === method.id;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onChange(method.id)}
              aria-pressed={active}
              className={`method-card ${active ? 'method-card--active' : ''}`}
            >
              <span className="method-card__icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="method-card__text">
                <span className="method-card__title">{method.label}</span>
                <span className="method-card__sub">{method.subtitle}</span>
              </span>
            </button>
          );
        })}

        <style>{`
          .method-cards {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.6rem;
          }

          @media (min-width: 540px) {
            .method-cards {
              gap: 0.75rem;
            }
          }

          .method-card {
            display: flex;
            align-items: center;
            gap: 0.85rem;
            text-align: left;
            padding: 0.8rem 1rem;
            border-radius: var(--radius-md);
            border: 1.5px solid var(--sand-300);
            background-color: var(--cream-100);
            color: var(--mocha-900);
            cursor: pointer;
            min-height: 56px;
            width: 100%;
            font-family: var(--font-sans);
            transition: background-color var(--transition-fast),
              border-color var(--transition-fast),
              box-shadow var(--transition-fast);
          }

          .method-card:hover:not(.method-card--active) {
            background-color: var(--sand-200);
            border-color: var(--taupe-500);
          }

          .method-card--active {
            background-color: var(--mocha-900);
            border-color: var(--mocha-900);
            color: var(--cream-50);
            box-shadow: var(--shadow-sm);
          }

          .method-card__icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background-color: var(--cream-50);
            color: var(--bronze-700);
            border: 1px solid var(--sand-300);
            flex-shrink: 0;
          }

          .method-card--active .method-card__icon {
            background-color: rgba(255, 253, 248, 0.14);
            border-color: rgba(255, 253, 248, 0.25);
            color: var(--cream-50);
          }

          .method-card__text {
            display: flex;
            flex-direction: column;
            min-width: 0;
          }

          .method-card__title {
            font-size: var(--text-sm);
            font-weight: 600;
            line-height: 1.25;
          }

          .method-card__sub {
            font-size: var(--text-xs);
            color: var(--mocha-600);
            line-height: 1.35;
          }

          .method-card--active .method-card__sub {
            color: var(--sand-200);
          }

          /* Phones: icon above title, subtitle hidden so both methods sit side by side */
          @media (max-width: 539px) {
            .method-card {
              flex-direction: column;
              justify-content: center;
              text-align: center;
              gap: 0.4rem;
              padding: 0.7rem 0.4rem;
            }

            .method-card__text {
              align-items: center;
            }

            .method-card__title {
              font-size: var(--text-xs);
            }

            .method-card__sub {
              display: none;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="method-toggle" role="group" aria-label="Matching Method">
      {METHODS.map((method) => {
        const Icon = method.icon;
        const active = value === method.id;
        return (
          <button
            key={method.id}
            type="button"
            onClick={() => onChange(method.id)}
            aria-pressed={active}
            className={`method-toggle__btn ${active ? 'method-toggle__btn--active' : ''}`}
          >
            <Icon size={14} aria-hidden="true" />
            <span>{method.label}</span>
          </button>
        );
      })}

      <style>{`
        .method-toggle {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 3px;
          border: 1.5px solid var(--sand-300);
          border-radius: var(--radius-md);
          background-color: var(--cream-50);
          max-width: 100%;
        }

        .method-toggle__btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.5rem 0.9rem;
          font-family: var(--font-sans);
          font-size: var(--text-xs);
          font-weight: 600;
          border: none;
          border-radius: 9px;
          background: transparent;
          color: var(--mocha-600);
          cursor: pointer;
          min-height: 44px;
          flex: 1 1 auto;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }

        .method-toggle__btn--active {
          background-color: var(--mocha-900);
          color: var(--cream-50);
        }

        .method-toggle__btn:hover:not(.method-toggle__btn--active) {
          background-color: var(--sand-200);
          color: var(--mocha-900);
        }

        @media (max-width: 479px) {
          .method-toggle {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
