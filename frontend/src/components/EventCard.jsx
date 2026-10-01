import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapPin, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TiltCard from './TiltCard';
import RatingBadge from './RatingBadge';
import { dateLocale } from '../i18n/dateLocale';

const formatDate = (d) =>
  new Date(d).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric', year: 'numeric' });

export default function EventCard({ event, index = 0 }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
      whileHover={{ y: -6 }}
    >
      <TiltCard intensity={8} className="group card overflow-hidden transition-shadow hover:shadow-glow">
        <Link to={`/events/${event.slug}`} className="block">
          <div className="relative h-44 overflow-hidden bg-vibe-gradient">
            {event.bannerUrl ? (
              <img
                src={event.bannerUrl}
                alt={event.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="font-display text-3xl font-bold text-white/90">
                  {event.title?.[0]}
                </span>
              </div>
            )}
            <span className="pill absolute left-3 top-3 bg-white/90 text-ink capitalize backdrop-blur">
              {t(`categories.${event.category}`)}
            </span>
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 font-display text-lg font-semibold text-ink">{event.title}</h3>
              <RatingBadge average={event.rating?.average} count={event.rating?.count} className="shrink-0" />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-sm text-ink/60">
              <Calendar size={15} />
              <span>{formatDate(event.startDt)}</span>
            </div>
            {event.venue?.city && (
              <div className="mt-1.5 flex items-center gap-1.5 text-sm text-ink/60">
                <MapPin size={15} />
                <span>{event.venue.name}, {event.venue.city}</span>
              </div>
            )}
          </div>
        </Link>
      </TiltCard>
    </motion.div>
  );
}
