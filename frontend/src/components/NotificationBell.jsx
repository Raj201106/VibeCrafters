import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { getSocket } from '../api/socket';

export default function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      /* not logged in yet */
    }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    const onNew = (payload) => {
      setItems((prev) => [{ _id: Date.now(), ...payload, createdAt: new Date() }, ...prev]);
      setUnread((n) => n + 1);
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, []);

  const markAllRead = async () => {
    setUnread(0);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    await api.patch('/notifications/read-all');
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread) markAllRead();
        }}
        className="relative rounded-full p-2 text-ink/70 transition hover:bg-ink/5 hover:text-ink"
        aria-label={t('notifications.ariaLabel')}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-vibe-gradient text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl2 border border-ink/8 bg-white shadow-card"
          >
            <div className="border-b border-ink/8 px-4 py-3 text-sm font-semibold text-ink">
              {t('notifications.title')}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-ink/50">{t('notifications.empty')}</p>
              ) : (
                items.map((n) => (
                  <div key={n._id} className="border-b border-ink/5 px-4 py-3 last:border-0">
                    <p className="text-sm font-medium text-ink">{n.title}</p>
                    <p className="mt-0.5 text-xs text-ink/60">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
