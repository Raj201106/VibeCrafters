import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', isDestructive = true }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl"
        >
          <div className="flex items-start justify-between">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-vibe-gradient-soft text-magenta'}`}>
              <AlertTriangle size={24} />
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink">
              <X size={20} />
            </button>
          </div>
          
          <div className="mt-4">
            <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
            <p className="mt-2 text-sm text-ink/60">{message}</p>
          </div>

          <div className="mt-8 flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] ${
                isDestructive ? 'bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20' : 'bg-ink hover:bg-ink/90'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
