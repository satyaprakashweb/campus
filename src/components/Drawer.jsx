import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useScrollReveal';

/**
 * Full-height cream mobile Drawer with focus trap and Escape to close.
 */
export default function Drawer({ isOpen, onClose, title = 'Navigation menu', header, footer, children }) {
  const drawerRef = useFocusTrap(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`drawer-overlay ${isOpen ? 'drawer-overlay--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        className={`drawer ${isOpen ? 'drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!isOpen}
      >
        <div className="drawer__header">
          <div>{header}</div>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
        {footer && <div className="drawer__actions">{footer}</div>}
      </aside>
    </>
  );
}
