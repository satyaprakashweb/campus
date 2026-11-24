import { Link } from 'react-router-dom';
import { MapPin, Calendar, Tag, ArrowRight } from 'lucide-react';
import Badge from './Badge';
import ItemImage from './ItemImage';
import { getCategoryLabel } from '../data/mockData';

/**
 * Reusable ItemCard for Browse Items, Dashboard, and Related Items.
 */
export default function ItemCard({ item, footerAction }) {
  const categoryLabel = getCategoryLabel(item.category);

  return (
    <article className="card card--hover item-card">
      <ItemImage item={item}>
        <div className="item-card__badges">
          <Badge status={item.type} />
          {item.status && item.status !== item.type && <Badge status={item.status} />}
        </div>
      </ItemImage>

      <div className="item-card__body">
        <h3 className="item-card__title">
          <Link to={`/items/${item.id}`}>{item.title}</Link>
        </h3>
        <p className="item-card__desc">{item.description}</p>

        <dl className="item-card__meta">
          <div>
            <dt className="sr-only">Category</dt>
            <dd>
              <Tag size={14} aria-hidden="true" /> {categoryLabel}
            </dd>
          </div>
          <div>
            <dt className="sr-only">Location</dt>
            <dd>
              <MapPin size={14} aria-hidden="true" /> {item.location}
            </dd>
          </div>
          <div>
            <dt className="sr-only">Date</dt>
            <dd>
              <Calendar size={14} aria-hidden="true" /> {item.date}
            </dd>
          </div>
        </dl>
      </div>

      <div className="item-card__footer">
        {footerAction || (
          <Link to={`/items/${item.id}`} className="item-card__link">
            View details <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>

      <style>{`
        .item-card {
          display: flex;
          flex-direction: column;
          padding: 1.15rem;
          gap: 1rem;
          height: 100%;
        }

        .item-card__badges {
          position: absolute;
          top: 0.75rem;
          left: 0.75rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          z-index: 2;
        }

        .item-card__badges .badge {
          box-shadow: 0 2px 8px rgba(61, 48, 38, 0.14);
          backdrop-filter: blur(6px);
        }

        .item-card__body {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          flex: 1;
        }

        .item-card__title {
          font-size: var(--text-xl);
          line-height: 1.25;
        }

        .item-card__title a {
          color: var(--mocha-900);
        }

        .item-card__title a:hover {
          color: var(--bronze-700);
        }

        .item-card__desc {
          font-size: var(--text-sm);
          color: var(--mocha-600);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 0.25rem;
        }

        .item-card__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem 1rem;
          margin-top: auto;
          padding-top: 0.35rem;
        }

        .item-card__meta dd {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: var(--text-xs);
          color: var(--mocha-600);
        }

        .item-card__footer {
          padding-top: 0.85rem;
          border-top: 1px solid var(--sand-300);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .item-card__link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--bronze-700);
          min-height: 44px;
        }

        .item-card__link:hover {
          color: var(--mocha-900);
        }
      `}</style>
    </article>
  );
}
