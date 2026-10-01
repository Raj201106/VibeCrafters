import { motion } from 'motion/react';

export default function LoadingSpinner({ full }) {
  const spinner = (
    <motion.div
      className="h-9 w-9 rounded-full border-[3px] border-ink/10 border-t-magenta"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
    />
  );

  if (!full) return spinner;

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-cream">
      {spinner}
    </div>
  );
}
