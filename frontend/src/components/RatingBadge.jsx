import { Star } from 'lucide-react';

/**
 * Renders nothing when there are zero reviews yet — showing "★ 0.0 (0)" on a brand-new event
 * reads as broken/discouraging rather than honest, so we simply omit the badge until real
 * feedback exists (the same pattern most marketplaces use for new listings).
 */
export default function RatingBadge({ average = 0, count = 0, size = 14, className = '' }) {
  if (!count) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium text-ink/70 ${className}`}>
      <Star size={size} fill="#F5811F" stroke="#F5811F" />
      {average.toFixed(1)}
      <span className="text-ink/40">({count})</span>
    </span>
  );
}
