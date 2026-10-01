import { motion, AnimatePresence } from 'motion/react';

/**
 * A branded loader shown (a) once on the very first app load, for slightly longer, and
 * (b) briefly on every route change, so navigating around the site always feels
 * intentional and "VibeCrafters" rather than an abrupt blank flash.
 */
export default function PageLoader({ visible, variant = 'route' }) {
  const isBoot = variant === 'boot';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-ink"
        >
          <svg width={isBoot ? 88 : 56} height={isBoot ? 88 : 56} viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="loader-swoosh" x1="10" y1="52" x2="54" y2="8" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#C81E6E" />
                <stop offset="1" stopColor="#F5811F" />
              </linearGradient>
            </defs>
            <motion.path
              d="M18 24c4 0 7 3 9 9l5 15 6-19c2-6 6-9 11-9-3 6-5 10-7 17-3 10-8 17-15 17s-13-7-15-16c-1-5 0-9 6-14Z"
              fill="none"
              stroke="url(#loader-swoosh)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 1, 0] }}
              transition={{ duration: 1.6, times: [0, 0.5, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }}
            />
          </svg>

          {isBoot && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mt-5 font-display text-sm font-semibold tracking-wide text-white/70"
            >
              VIBE<span className="text-transparent bg-vibe-gradient bg-clip-text">CRAFTERS</span>
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
