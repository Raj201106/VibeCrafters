import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import { Calendar, MapPin, Minus, Plus, Ticket as TicketIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import TicketAddedPopup from '../components/TicketAddedPopup';
import RatingBadge from '../components/RatingBadge';
import { useAuth } from '../context/AuthContext';
import { dateLocale } from '../i18n/dateLocale';

const fmt = (d) =>
  new Date(d).toLocaleString(dateLocale(), { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function EventDetails() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAdded, setShowAdded] = useState(false);

  // Scroll-linked parallax: the banner drifts down and scales up slightly as the page
  // scrolls past it, giving the flat hero image a sense of depth without any WebGL.
  const bannerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: bannerRef, offset: ['start start', 'end start'] });
  const bannerY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const bannerScale = useTransform(scrollYProgress, [0, 1], [1, 1.18]);

  useEffect(() => {
    api.get(`/events/${slug}`).then(({ data }) => {
      setData(data);
      setSelected(data.ticketTypes?.[0] || null);
    });
  }, [slug]);

  // Client-side routing doesn't get the browser's native "scroll to #hash" behavior for
  // free, so links that promise to land on the booking panel (the hero ticket, gallery
  // cards) append #booking and we handle the scroll ourselves once the panel exists. The
  // short delay lets the panel's own entrance animation (rotateX -10deg -> 0, see below)
  // settle first — scrolling mid-animation would target a transiently-offset position.
  useEffect(() => {
    if (data && location.hash === '#booking') {
      const id = setTimeout(() => {
        document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 600);
      return () => clearTimeout(id);
    }
  }, [data, location.hash]);

  if (!data) return <LoadingSpinner full />;
  const { event, ticketTypes, rating } = data;

  const bookNow = async () => {
    if (!user) return navigate('/login', { state: { from: { pathname: `/events/${slug}` } } });
    if (!selected) return toast.error(t('eventDetails.selectTierError'));
    setBusy(true);
    try {
      const { data: booking } = await api.post('/tickets/book', {
        ticketTypeId: selected._id,
        quantity: qty,
        promoCode: promoCode || undefined,
      });

      if (booking.totalAmount === 0 || !booking.stripeUrl) {
        setShowAdded(true);
        setTimeout(() => navigate('/receipt', { state: { booking } }), 1100);
        setBusy(false);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = booking.stripeUrl;
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  return (
    <div>
      <TicketAddedPopup visible={showAdded} quantity={qty} eventTitle={event.title} />
      <div ref={bannerRef} className="h-64 w-full overflow-hidden bg-vibe-gradient sm:h-80">
        {event.bannerUrl && (
          <motion.img
            src={event.bannerUrl}
            alt={event.title}
            style={{ y: bannerY, scale: bannerScale }}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <span className="pill bg-vibe-gradient-soft capitalize text-magenta">{t(`categories.${event.category}`)}</span>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{event.title}</h1>
            <RatingBadge average={rating?.average} count={rating?.count} size={16} />
          </div>

          <div className="mt-5 flex flex-wrap gap-6 text-sm text-ink/70">
            <div className="flex items-center gap-2">
              <Calendar size={17} className="text-magenta" />
              {fmt(event.startDt)}
            </div>
            {event.venue && (
              <div className="flex items-center gap-2">
                <MapPin size={17} className="text-magenta" />
                {event.venue.name}, {event.venue.city}
              </div>
            )}
          </div>

          <p className="mt-6 whitespace-pre-line leading-relaxed text-ink/80">{event.description}</p>

          {event.agenda?.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold text-ink">{t('eventDetails.agenda')}</h2>
              <div className="mt-4 space-y-3">
                {event.agenda.map((a, i) => (
                  <div key={i} className="flex gap-4 rounded-xl2 border border-ink/8 bg-white p-4">
                    <span className="w-16 shrink-0 text-sm font-semibold text-magenta">{a.time}</span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{a.title}</p>
                      {a.speaker && <p className="text-xs text-ink/60">{a.speaker}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Name + service type only — vendor contact details stay gated behind the
              directory/organizer relationship, never exposed on the public event page. */}
          {event.vendors?.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold text-ink">{t('eventDetails.producedWith')}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {event.vendors.map((v) => (
                  <span key={v._id} className="pill bg-ink/5 text-ink/70">
                    {v.name} <span className="capitalize text-ink/40">· {t(`serviceTypes.${v.serviceType}`)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Booking panel — a one-time 3D "tilt up into place" on load; no continuous
            mouse-tracking tilt here since that would fight with clicking the tier buttons */}
        <motion.div
          initial={{ opacity: 0, y: 24, rotateX: -10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformPerspective: 1200, transformStyle: 'preserve-3d' }}
          className="card sticky top-24 h-fit p-6"
          id="booking"
        >
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <TicketIcon size={18} className="text-magenta" /> {t('eventDetails.getYourTicket')}
          </h3>

          <div className="mt-4 space-y-2">
            {ticketTypes.map((tt) => (
              <motion.button
                key={tt._id}
                onClick={() => setSelected(tt)}
                disabled={tt.available === 0}
                whileTap={{ scale: tt.available === 0 ? 1 : 0.98 }}
                className={`relative w-full overflow-hidden rounded-xl2 border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected?._id === tt._id ? 'border-magenta' : 'border-ink/10 hover:border-ink/25'
                }`}
              >
                {selected?._id === tt._id && (
                  <motion.div
                    layoutId="tier-highlight"
                    className="absolute inset-0 bg-vibe-gradient-soft"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <div className="relative flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{tt.name}</span>
                  <span className="text-sm font-semibold text-ink">₹{tt.price}</span>
                </div>
                <p className="relative mt-0.5 text-xs text-ink/50">
                  {tt.available === 0 ? t('eventDetails.soldOut') : t('eventDetails.leftCount', { count: tt.available })}
                </p>
              </motion.button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-ink/70">{t('eventDetails.quantity')}</span>
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="rounded-full border border-ink/15 p-1.5 hover:bg-ink/5"
              >
                <Minus size={14} />
              </motion.button>
              <motion.span
                key={qty}
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="w-4 text-center text-sm font-semibold"
              >
                {qty}
              </motion.span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                className="rounded-full border border-ink/15 p-1.5 hover:bg-ink/5"
              >
                <Plus size={14} />
              </motion.button>
            </div>
          </div>

          <input
            className="input mt-4"
            placeholder={t('eventDetails.promoPlaceholder')}
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
          />

          <motion.button
            onClick={bookNow}
            disabled={busy || !selected}
            whileHover={{ scale: busy || !selected ? 1 : 1.02 }}
            whileTap={{ scale: busy || !selected ? 1 : 0.98 }}
            className="btn-primary mt-5 w-full hover:!scale-100 active:!scale-100"
          >
            {busy ? t('eventDetails.booking') : t('eventDetails.bookNow', { count: qty })}
          </motion.button>
          <p className="mt-2 text-center text-xs text-ink/40">{t('eventDetails.instantConfirm')}</p>
        </motion.div>
      </div>
    </div>
  );
}
