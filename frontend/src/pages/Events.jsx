import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import EventCard from '../components/EventCard';
import LoadingSpinner from '../components/LoadingSpinner';

const categories = ['all', 'conference', 'concert', 'wedding', 'corporate', 'festival', 'workshop', 'other'];
const PAGE_SIZE = 12;

export default function Events() {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');

  const fetchPage = (targetPage, append) => {
    const params = new URLSearchParams({ limit: PAGE_SIZE, page: targetPage });
    if (q) params.set('q', q);
    if (category !== 'all') params.set('category', category);

    return api.get(`/events?${params.toString()}`).then(({ data }) => {
      setEvents((prev) => (append ? [...prev, ...data.events] : data.events));
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
    });
  };

  // Reset to page 1 whenever the search term or category changes
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      fetchPage(1, false).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category]);

  const loadMore = () => {
    setLoadingMore(true);
    fetchPage(page + 1, true).finally(() => setLoadingMore(false));
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="font-display text-3xl font-semibold text-ink"
      >
        {t('events.title')}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mt-1 text-ink/60"
      >
        {t('events.subtitle')}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
          <input
            className="input pl-11"
            placeholder={t('events.searchPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className="input sm:w-52" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? t('events.allCategories') : t(`categories.${c}`)}
            </option>
          ))}
        </select>
      </motion.div>

      <div className="mt-10">
        {loading ? (
          <LoadingSpinner />
        ) : events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="card p-12 text-center"
          >
            <p className="font-display text-lg font-semibold text-ink">{t('events.noneTitle')}</p>
            <p className="mt-1 text-sm text-ink/60">{t('events.noneBody')}</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={`${q}-${category}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
              <p className="mb-4 text-sm text-ink/50">
                {t('events.showingResults', { shown: events.length, count: total })}
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((e, i) => (
                  <EventCard key={e._id} event={e} index={i % PAGE_SIZE} />
                ))}
              </div>
              {page < pages && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-10 flex justify-center"
                >
                  <button onClick={loadMore} disabled={loadingMore} className="btn-secondary">
                    {loadingMore ? t('events.loading') : t('events.loadMore')}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
