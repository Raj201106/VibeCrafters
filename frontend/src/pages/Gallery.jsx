import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import GalleryFlipCard from '../components/GalleryFlipCard';

const PAGE_SIZE = 24;

export default function Gallery() {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const toPhotos = (events) =>
    events
      .filter((e) => e.bannerUrl)
      .map((e) => ({
        url: e.bannerUrl,
        title: e.title,
        category: e.category,
        slug: e.slug,
        startDt: e.startDt,
        venueName: e.venue?.name || e.venue?.city || '',
      }));

  useEffect(() => {
    api.get(`/events?limit=${PAGE_SIZE}&page=1`).then(({ data }) => {
      setPhotos(toPhotos(data.events));
      setPage(data.page);
      setPages(data.pages);
    });
  }, []);

  const loadMore = () => {
    setLoadingMore(true);
    api
      .get(`/events?limit=${PAGE_SIZE}&page=${page + 1}`)
      .then(({ data }) => {
        setPhotos((prev) => [...prev, ...toPhotos(data.events)]);
        setPage(data.page);
        setPages(data.pages);
      })
      .finally(() => setLoadingMore(false));
  };

  if (!photos) return <LoadingSpinner full />;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <span className="pill bg-vibe-gradient-soft text-magenta">{t('gallery.tag')}</span>
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">{t('gallery.title')}</h1>
        <p className="mt-2 max-w-xl text-ink/60">
          {t('gallery.body')}
        </p>
      </motion.div>

      {photos.length === 0 ? (
        <div className="card mt-10 p-12 text-center">
          <p className="text-ink/60">{t('gallery.empty')}</p>
        </div>
      ) : (
        <>
          <div className="mt-10 columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5">
            {photos.map((p, i) => (
              <GalleryFlipCard key={i} photo={p} index={i % PAGE_SIZE} />
            ))}
          </div>
          {page < pages && (
            <div className="mt-4 flex justify-center">
              <button onClick={loadMore} disabled={loadingMore} className="btn-secondary">
                {loadingMore ? t('gallery.loading') : t('gallery.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

