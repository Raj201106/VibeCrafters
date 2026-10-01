import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, QrCode, LineChart, Users2 } from 'lucide-react';
import api from '../api/axios';
import EventCard from '../components/EventCard';
import LoadingSpinner from '../components/LoadingSpinner';
import TiltCard from '../components/TiltCard';
import Hero3DTicket from '../components/Hero3DTicket';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export default function Home() {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/events?limit=6')
      .then(({ data }) => setEvents(data.events))
      .finally(() => setLoading(false));
  }, []);

  const valueProps = [
    { icon: QrCode, title: t('home.value1Title'), body: t('home.value1Body') },
    { icon: Users2, title: t('home.value2Title'), body: t('home.value2Body') },
    { icon: LineChart, title: t('home.value3Title'), body: t('home.value3Body') },
  ];

  return (
    <div>
      {/* Hero — one orchestrated reveal, echoing the logo's shooting-star sweep */}
      <section className="relative overflow-hidden bg-ink">
        <div className="pointer-events-none absolute inset-0 bg-vibe-radial opacity-70" />
        <svg
          className="pointer-events-none absolute -right-24 -top-24 h-[560px] w-[560px] opacity-90"
          viewBox="0 0 200 200"
        >
          <defs>
            <linearGradient id="hero-swoosh" x1="0" y1="200" x2="200" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#C81E6E" />
              <stop offset="1" stopColor="#F5811F" />
            </linearGradient>
          </defs>
          <motion.path
            d="M20 150c22 0 36 16 44 40l16 -70c8 -32 26 -46 50 -46 -14 30 -22 46 -30 76 -12 42 -34 66 -60 66S28 190 20 150Z"
            fill="none"
            stroke="url(#hero-swoosh)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
          />
        </svg>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-24 sm:py-32 lg:grid-cols-2"
        >
          <div>
            <motion.span variants={item} className="pill bg-white/10 text-white/80">
              {t('home.heroTag')}
            </motion.span>
            <motion.h1
              variants={item}
              className="mt-6 max-w-2xl font-display text-4xl font-semibold leading-[1.1] text-white sm:text-6xl"
            >
              {t('home.heroTitle')}
            </motion.h1>
            <motion.p variants={item} className="mt-6 max-w-xl text-lg text-white/70">
              {t('home.heroBody')}
            </motion.p>
            <motion.div variants={item} className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/events" className="btn-primary">
                {t('home.exploreEvents')} <ArrowRight size={16} />
              </Link>
              <Link to="/register" className="btn-secondary !bg-white/5 !text-white !border-white/20 hover:!border-white/40">
                {t('home.becomeOrganizer')}
              </Link>
            </motion.div>
          </div>

          <motion.div variants={item}>
            <Hero3DTicket events={events} />
          </motion.div>
        </motion.div>
      </section>

      {/* Value props — grounded in the actual EMS modules, not generic feature copy */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {valueProps.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <TiltCard intensity={6} className="card h-full p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-vibe-gradient-soft text-magenta">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm text-ink/60">{body}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured events */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-2xl font-semibold text-ink">{t('home.happeningSoon')}</h2>
          <Link to="/events" className="text-sm font-semibold text-magenta hover:underline">
            {t('home.viewAll')}
          </Link>
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : events.length === 0 ? (
          <p className="text-ink/50">{t('home.noEvents')}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e, i) => (
              <EventCard key={e._id} event={e} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
