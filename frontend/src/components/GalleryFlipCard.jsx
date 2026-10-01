import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '../i18n/dateLocale';

const formatDate = (dt) =>
  new Date(dt).toLocaleDateString(dateLocale(), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

/**
 * Front face is the event photo; back face reveals event details and a booking link.
 * Flips on hover (desktop) and on tap (touch, since there's no hover state to trigger
 * from) — a second tap on the back face's "Book tickets" link then navigates through.
 * The front face's image is what sets this card's height in Gallery's masonry columns;
 * the back face is absolutely positioned to exactly cover that same box.
 *
 * This component is the direct child of Gallery's CSS-columns masonry container (it owns
 * its own entrance animation rather than being wrapped in a separate motion.div for that)
 * so its z-index bump while flipped actually elevates it above sibling cards — z-index set
 * one level deeper wouldn't reliably win, since Motion's transform styles put each masonry
 * item's wrapper in its own stacking context, and z-index only resolves within one context.
 */
export default function GalleryFlipCard({ photo, index = 0 }) {
  const { t } = useTranslation();
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
      className={`relative [perspective:1200px] ${flipped ? 'z-20' : 'z-0'}`}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onClick={() => setFlipped((f) => !f)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative"
      >
        {/* Front — the photo, sets the card's height */}
        <div style={{ backfaceVisibility: 'hidden' }} className="overflow-hidden rounded-xl2 shadow-card">
          <img src={photo.url} alt={photo.title} className="w-full object-cover" loading="lazy" />
        </div>

        {/* Back — event details, absolutely covers the same box as the front */}
        <div
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-xl2 bg-ink p-5 text-white shadow-card"
        >
          <div>
            <span className="pill bg-white/10 capitalize text-white/80">{t(`categories.${photo.category}`)}</span>
            <p className="mt-3 font-display text-lg font-semibold leading-snug">{photo.title}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-white/60">
              <Calendar size={13} /> {formatDate(photo.startDt)}
            </p>
            {photo.venueName && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-white/60">
                <MapPin size={13} /> {photo.venueName}
              </p>
            )}
          </div>
          <Link
            to={`/events/${photo.slug}#booking`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-vibe-gradient py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {t('gallery.bookTickets')} <ArrowRight size={14} />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
