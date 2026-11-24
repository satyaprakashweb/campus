import { useState } from 'react';
import { CreditCard, Smartphone, BookOpen, Key, Briefcase, Package } from 'lucide-react';
import { getCategoryLabel } from '../data/mockData';

const CATEGORY_ICONS = {
  'id-card': CreditCard,
  phone: Smartphone,
  book: BookOpen,
  key: Key,
  bag: Briefcase,
  other: Package,
};

const CATEGORY_FALLBACK_PHOTOS = {
  'id-card': '/images/id-card.jpg',
  phone: '/images/mobile-black.jpg',
  book: '/images/book.jpg',
  key: '/images/keys.jpg',
  bag: '/images/backpack.jpg',
  other: '/images/earbuds.jpg',
};

/**
 * Item photograph with graceful fallback to a relevant category photo and icon.
 * - variant="media": responsive aspect-ratio frame (cards, detail page)
 * - variant="thumb": small square thumbnail (lists, match cards)
 */
export default function ItemImage({
  item,
  variant = 'media',
  square = false,
  large = false,
  eager = false,
  children,
}) {
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const Icon = CATEGORY_ICONS[item?.category] || Package;
  const fallbackSrc = CATEGORY_FALLBACK_PHOTOS[item?.category] || '/images/phone.jpg';
  const activeSrc = !primaryFailed && item?.photo ? item.photo : !fallbackFailed ? fallbackSrc : null;
  const hasPhoto = Boolean(activeSrc);
  const alt = item ? `Photo of ${item.title}` : '';

  const handleImgError = () => {
    if (!primaryFailed && item?.photo) {
      setPrimaryFailed(true);
    } else {
      setFallbackFailed(true);
    }
  };

  if (variant === 'thumb') {
    return (
      <div className={`thumb ${large ? 'thumb--lg' : ''}`}>
        {hasPhoto ? (
          <img
            src={activeSrc}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            width="120"
            height="120"
            onError={handleImgError}
          />
        ) : (
          <Icon size={large ? 34 : 26} strokeWidth={1.5} aria-hidden="true" />
        )}
      </div>
    );
  }

  return (
    <div className={`item-media ${square ? 'item-media--square' : ''}`}>
      {hasPhoto ? (
        <img
          src={activeSrc}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          width="800"
          height="500"
          onError={handleImgError}
        />
      ) : (
        <>
          <Icon size={square ? 56 : 36} strokeWidth={1.4} aria-hidden="true" />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--mocha-600)' }}>
            No photo provided · {getCategoryLabel(item?.category)}
          </span>
        </>
      )}
      {children}
    </div>
  );
}
