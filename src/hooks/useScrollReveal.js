import { useEffect, useRef } from 'react';

/**
 * IntersectionObserver hook for scroll-triggered fade-up animations.
 * Respects prefers-reduced-motion.
 */
export function useScrollReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const el = ref.current;
    if (el) {
      // Observe all children with .fade-up class, or the element itself
      const targets = el.querySelectorAll('.fade-up');
      if (targets.length > 0) {
        targets.forEach((target) => observer.observe(target));
      } else {
        el.classList.add('fade-up');
        observer.observe(el);
      }
    }

    return () => observer.disconnect();
  }, []);

  return ref;
}

/**
 * Focus trap hook for modals/drawers.
 */
export function useFocusTrap(isOpen) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen || !ref.current) return;

    const el = ref.current;
    const focusableSelectors = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Let parent handle Escape
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = el.querySelectorAll(focusableSelectors);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Focus first focusable element
    const focusables = el.querySelectorAll(focusableSelectors);
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return ref;
}
