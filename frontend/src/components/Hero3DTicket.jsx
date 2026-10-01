import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '../i18n/dateLocale';

const CYCLE_MS = 4500;

const formatDate = (dt) =>
  new Date(dt).toLocaleDateString(dateLocale(), { weekday: 'short', month: 'short', day: 'numeric' });

/**
 * A CSS/Motion-only "3D" floating ticket card — layered depth via perspective + translateZ,
 * with a continuous gentle float/rotate loop. Deliberately lightweight (no WebGL) so it stays
 * fast on any device while still reading as a dimensional, tactile object in the hero.
 *
 * Cycles through real upcoming events (passed in as `events`, the same list Home.jsx already
 * fetches for the grid below) so the hero always reflects what's actually on the platform
 * rather than a hardcoded example. Clicking the card jumps straight to that event's booking
 * panel.
 */
export default function Hero3DTicket({ events = [] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  const CATEGORY_BADGE = {
    conference: t('hero.badgeConference'),
    concert: t('hero.badgeConcert'),
    wedding: t('hero.badgeWedding'),
    corporate: t('hero.badgeCorporate'),
    festival: t('hero.badgeFestival'),
    workshop: t('hero.badgeWorkshop'),
    other: t('hero.badgeOther'),
  };

  useEffect(() => {
    if (events.length < 2) return; // nothing to cycle through
    const id = setInterval(() => setIndex((i) => (i + 1) % events.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [events.length]);

  // Generated once, not on every render/cycle — otherwise the "QR" pattern would visibly
  // re-scramble every 4.5s along with the text, which reads as broken rather than dimensional.
  const qrPattern = useMemo(() => Array.from({ length: 48 }, () => Math.random() > 0.45), []);

  const event = events[index];
  const badge = event ? CATEGORY_BADGE[event.category] || t('hero.badgeOther') : t('hero.badgeConcert');
  const title = event?.title || t('hero.placeholderTitle');
  const dateVenue = event
    ? `${formatDate(event.startDt)} · ${event.venue?.name || event.venue?.city || t('hero.venueTBA')}`
    : t('hero.placeholderDateVenue');

  return (
    <div
      className="relative hidden h-[420px] w-full items-center justify-center lg:flex"
      style={{ perspective: 1200 }}
    >
      <motion.div
        animate={{ y: [0, -16, 0], rotateZ: [-3, 3, -3] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative"
      >
        {/* Back glow layer */}
        <motion.div
          animate={{ rotateY: [8, -8, 8], rotateX: [4, -4, 4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transform: 'translateZ(-40px)' }}
          className="absolute inset-0 -m-6 rounded-[2rem] bg-vibe-gradient opacity-30 blur-2xl"
        />

        {/* Ticket card */}
        <motion.div
          animate={{ rotateY: [8, -8, 8], rotateX: [4, -4, 4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d' }}
          onClick={() => event && navigate(`/events/${event.slug}#booking`)}
          whileHover={event ? { scale: 1.03 } : undefined}
          className={`relative w-72 rounded-2xl bg-white p-6 shadow-2xl ${event ? 'cursor-pointer' : ''}`}
          title={event ? t('hero.viewEvent', { title: event.title }) : undefined}
        >
          <div className="flex items-center justify-between">
            <span className="pill bg-vibe-gradient-soft text-magenta">{badge}</span>
            <div className="h-8 w-8 rounded-full bg-vibe-gradient" style={{ transform: 'translateZ(24px)' }} />
          </div>

          {/* Only the text content crossfades between events — the card itself keeps its
              continuous float/tilt loop uninterrupted */}
          <AnimatePresence mode="wait">
            <motion.div
              key={event?._id || 'placeholder'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
            >
              <p
                style={{ transform: 'translateZ(20px)' }}
                className="mt-5 line-clamp-2 font-display text-lg font-semibold leading-snug text-ink"
              >
                {title}
              </p>
              <p style={{ transform: 'translateZ(14px)' }} className="mt-1 text-xs text-ink/50">
                {dateVenue}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="my-5 border-t border-dashed border-ink/15" />

          <div
            style={{ transform: 'translateZ(28px)' }}
            className="flex h-24 items-center justify-center rounded-xl bg-ink/[0.03]"
          >
            <div className="grid grid-cols-8 gap-0.5">
              {qrPattern.map((on, i) => (
                <div key={i} className="h-1.5 w-1.5 rounded-[1px]" style={{ background: on ? '#0F2A3D' : 'transparent' }} />
              ))}
            </div>
          </div>
          <p style={{ transform: 'translateZ(14px)' }} className="mt-3 text-center text-[11px] tracking-widest text-ink/40">
            {event ? t('hero.tapToBook') : t('hero.scanToCheckIn')}
          </p>

          {events.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5" style={{ transform: 'translateZ(14px)' }}>
              {events.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-magenta' : 'w-1.5 bg-ink/15'}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
