import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Shared modal shell used by every dialog in the app. Handles the
 * accessibility mechanics that are easy to skip under time pressure:
 * - traps Tab/Shift+Tab focus inside the dialog while open
 * - closes on Escape
 * - restores focus to whatever triggered it on close
 * - marks itself up as role="dialog" aria-modal for screen readers
 */
export default function Modal({ open, onClose, title, children, maxWidthClass = 'max-w-lg' }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll(FOCUSABLE_SELECTOR);
    focusable?.[0]?.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className={`fixed left-1/2 top-1/2 z-50 w-full ${maxWidthClass} -translate-x-1/2 -translate-y-1/2 px-4`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            ref={dialogRef}
          >
            <div className="glass-panel max-h-[85vh] overflow-y-auto p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
                <button onClick={onClose} className="text-mist-dim hover:text-mist" aria-label="Close dialog">
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
