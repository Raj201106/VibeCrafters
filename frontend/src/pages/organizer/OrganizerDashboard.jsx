import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Calendar, DollarSign, Ticket, CheckCircle, MapPin, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import AnimatedCounter from '../../components/AnimatedCounter';
import { dateLocale } from '../../i18n/dateLocale';

const statusPill = {
  draft: 'bg-ink/10 text-ink/60',
  published: 'bg-vibe-gradient-soft text-magenta',
  completed: 'bg-ink/10 text-ink/50',
  cancelled: 'bg-red-100 text-red-600',
  booked: 'bg-vibe-gradient-soft text-magenta',
  'checked-in': 'bg-ink/10 text-ink/60',
  refunded: 'bg-red-100 text-red-600',
};

export default function OrganizerDashboard() {
  const { t } = useTranslation();
  const [kpis, setKpis] = useState(null);
  const [events, setEvents] = useState(null);
  const [recentOrders, setRecentOrders] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const EVENTS_PAGE_SIZE = 20;

  const loadEventsPage = (targetPage, append) =>
    api.get(`/events?mine=true&limit=${EVENTS_PAGE_SIZE}&page=${targetPage}`).then(({ data }) => {
      setEvents((prev) => (append ? [...prev, ...data.events] : data.events));
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
    });

  const load = () => {
    api.get('/reports/overview').then(({ data }) => setKpis(data.kpis));
    api.get('/reports/recent-orders').then(({ data }) => setRecentOrders(data.orders));
    loadEventsPage(1, false);
  };

  useEffect(load, []);

  const loadMoreEvents = () => {
    setLoadingMore(true);
    loadEventsPage(page + 1, true).finally(() => setLoadingMore(false));
  };

  const publish = async (id) => {
    try {
      await api.patch(`/events/${id}/status`, { status: 'published' });
      toast.success(t('organizerDashboard.publishedToast'));
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeDraft = async (event) => {
    if (!confirm(t('organizerDashboard.deleteConfirm', { title: event.title }))) return;
    try {
      await api.delete(`/events/${event._id}`);
      toast.success(t('organizerDashboard.deletedToast'));
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const cancelEvent = async (event) => {
    if (!confirm(`Are you sure you want to CANCEL "${event.title}"? All booked tickets will be refunded automatically.`)) return;
    try {
      await api.patch(`/events/${event._id}/status`, { status: 'cancelled' });
      toast.success('Event cancelled & refunds initiated');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (!kpis || !events) return <LoadingSpinner full />;

  const cards = [
    { label: t('organizerDashboard.cardTotalEvents'), value: kpis.totalEvents, icon: Calendar },
    { label: t('organizerDashboard.cardPublished'), value: kpis.published, icon: CheckCircle },
    { label: t('organizerDashboard.cardTicketsSold'), value: kpis.totalTicketsSold, icon: Ticket },
    { label: t('organizerDashboard.cardRevenue'), value: kpis.totalRevenue, prefix: '₹', icon: DollarSign },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{t('organizerDashboard.title')}</h1>
          <p className="mt-1 text-ink/60">{t('organizerDashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/organizer/scan" className="btn-secondary">
            <ScanLine size={16} /> {t('organizerDashboard.scanTickets')}
          </Link>
          <Link to="/organizer/venues" className="btn-secondary">
            <MapPin size={16} /> {t('organizerDashboard.venues')}
          </Link>
          <Link to="/organizer/create" className="btn-primary">
            <Plus size={17} /> {t('organizerDashboard.newEvent')}
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, prefix, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
            whileHover={{ y: -3 }}
            className="card p-5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-vibe-gradient-soft text-magenta">
              <Icon size={17} />
            </div>
            <p className="mt-4 font-display text-2xl font-semibold text-ink">
              <AnimatedCounter value={value} prefix={prefix} />
            </p>
            <p className="text-sm text-ink/50">{label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">{t('organizerDashboard.yourEvents')} {total > 0 && `(${total})`}</h2>
        {events.length === 0 ? (
          <div className="card mt-4 p-10 text-center">
            <p className="text-ink/60">{t('organizerDashboard.noEvents')}</p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl2 border border-ink/8 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink/[0.03] text-ink/50">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('organizerDashboard.colEvent')}</th>
                  <th className="px-5 py-3 font-medium">{t('organizerDashboard.colDate')}</th>
                  <th className="px-5 py-3 font-medium">Tickets Sold</th>
                  <th className="px-5 py-3 font-medium">{t('organizerDashboard.colStatus')}</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e._id} className="border-t border-ink/6">
                    <td className="px-5 py-3 font-medium text-ink">{e.title}</td>
                    <td className="px-5 py-3 text-ink/60">
                      {new Date(e.startDt).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-ink/70">
                      <div className="flex items-center gap-1.5">
                        <Ticket size={14} className="text-magenta" /> {e.ticketsSold || 0}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`pill capitalize ${statusPill[e.status]}`}>{t(`eventStatus.${e.status}`)}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {e.status === 'draft' && (
                          <button onClick={() => publish(e._id)} className="text-xs font-semibold text-magenta hover:underline">
                            {t('organizerDashboard.publish')}
                          </button>
                        )}
                        <Link to={`/organizer/edit/${e.slug}`} className="text-xs font-semibold text-ink/60 hover:text-ink hover:underline">
                          {t('organizerDashboard.edit')}
                        </Link>
                        <Link to={`/organizer/events/${e._id}/attendees`} className="text-xs font-semibold text-ink/60 hover:text-ink hover:underline">
                          {t('organizerDashboard.attendees')}
                        </Link>
                        {e.status === 'draft' && (
                          <button onClick={() => removeDraft(e)} className="text-xs font-semibold text-ink/40 hover:text-red-500 hover:underline">
                            {t('organizerDashboard.delete')}
                          </button>
                        )}
                        {e.status === 'published' && (
                          <button onClick={() => cancelEvent(e)} className="text-xs font-semibold text-ink/40 hover:text-red-500 hover:underline">
                            Cancel Event
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {page < pages && (
          <div className="mt-4 flex justify-center">
            <button onClick={loadMoreEvents} disabled={loadingMore} className="btn-secondary">
              {loadingMore ? t('organizerDashboard.loading') : t('organizerDashboard.loadMoreEvents')}
            </button>
          </div>
        )}
      </div>

      {recentOrders && recentOrders.length > 0 && (
        <div className="mt-16">
          <h2 className="font-display text-xl font-semibold text-ink">Recent Ticket Activity</h2>
          <p className="mt-1 mb-4 text-ink/60">A global view of all recent bookings and cancellations across your events.</p>
          <div className="overflow-hidden rounded-xl2 border border-ink/8 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink/[0.03] text-ink/50">
                <tr>
                  <th className="px-5 py-3 font-medium">Attendee</th>
                  <th className="px-5 py-3 font-medium">Event</th>
                  <th className="px-5 py-3 font-medium">Tier</th>
                  <th className="px-5 py-3 font-medium">Price</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o._id} className="border-t border-ink/6">
                    <td className="px-5 py-3 font-medium text-ink">
                      {o.user?.name}
                      <span className="block text-xs font-normal text-ink/50">{o.user?.email}</span>
                    </td>
                    <td className="px-5 py-3 font-medium text-ink">
                      <Link to={`/organizer/events/${o.event?._id}/attendees`} className="hover:underline hover:text-magenta">
                        {o.event?.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink/70">{o.ticketType?.name}</td>
                    <td className="px-5 py-3 font-medium text-ink">₹{o.priceAtPurchase.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3">
                      <span className={`pill capitalize ${statusPill[o.status] || 'bg-ink/10 text-ink/60'}`}>
                        {t(`ticketStatus.${o.status}`)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ink/60">
                      {new Date(o.updatedAt).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
