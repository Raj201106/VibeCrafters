import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useInView } from 'motion/react';

/**
 * Animates from 0 to `value` when it scrolls into view, using a spring so the
 * count settles with a bit of natural overshoot rather than a linear tick-up.
 * Pass a `prefix`/`suffix` (e.g. "₹") to decorate the formatted number.
 */
export default function AnimatedCounter({ value = 0, prefix = '', suffix = '', decimals = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 20, mass: 0.6 });

  useEffect(() => {
    if (inView) motionValue.set(Number(value) || 0);
  }, [inView, value, motionValue]);

  useEffect(() => {
    return spring.on('change', (v) => {
      if (ref.current) {
        ref.current.textContent =
          prefix + v.toLocaleString('en-IN', { maximumFractionDigits: decimals }) + suffix;
      }
    });
  }, [spring, prefix, suffix, decimals]);

  return <motion.span ref={ref}>{prefix}0{suffix}</motion.span>;
}
