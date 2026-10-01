import { motion, AnimatePresence } from 'motion/react';
import { Ticket } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const confettiColors = ['#C81E6E', '#F5811F', '#0F2A3D', '#FBAA4C', '#E14C8C'];

export default function TicketAddedPopup({ visible, quantity = 1, eventTitle = '' }) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[998] flex items-center justify-center bg-ink/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
            className="relative flex flex-col items-center rounded-xl2 bg-white px-10 py-9 text-center shadow-glow"
          >
            {/* Confetti burst */}
            {confettiColors.map((color, i) => (
              <motion.span
                key={i}
                className="absolute h-2 w-2 rounded-sm"
                style={{ background: color, top: '38%', left: '50%' }}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                animate={{
                  x: Math.cos((i / confettiColors.length) * Math.PI * 2) * 90,
                  y: Math.sin((i / confettiColors.length) * Math.PI * 2) * 90 - 20,
                  opacity: 0,
                  rotate: 180,
                }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            ))}

            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 14 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-vibe-gradient text-white"
            >
              <Ticket size={28} />
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 font-display text-lg font-semibold text-ink"
            >
              {t('ticketPopup.ticketBooked', { count: quantity })}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28 }}
              className="mt-1 max-w-[220px] text-sm text-ink/60"
            >
              {t('ticketPopup.confirming', { eventTitle })}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
