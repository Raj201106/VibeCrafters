import { useState } from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function StarRating({ value = 0, onChange, readOnly = false, size = 22 }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHovered(n)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          whileHover={readOnly ? {} : { scale: 1.15 }}
          whileTap={readOnly ? {} : { scale: 0.9 }}
          className={readOnly ? 'cursor-default' : 'cursor-pointer'}
          aria-label={t('rating.starLabel', { count: n })}
        >
          <Star
            size={size}
            fill={n <= display ? 'url(#star-gradient)' : 'none'}
            stroke={n <= display ? '#C81E6E' : '#0F2A3D40'}
            strokeWidth={1.5}
          />
        </motion.button>
      ))}
      {/* Shared gradient definition so filled stars pick up the brand gradient, not a flat color */}
      <svg width="0" height="0">
        <defs>
          <linearGradient id="star-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C81E6E" />
            <stop offset="100%" stopColor="#F5811F" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
