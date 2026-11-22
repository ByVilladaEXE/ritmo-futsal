import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="max-h-[80dvh] w-full overflow-y-auto rounded-t-3xl border-t border-[var(--line)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            style={{ background: 'var(--sheet)' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
