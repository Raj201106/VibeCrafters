import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, X, Download, MessageCircle, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import ChatWidget from '../components/ChatWidget';
import StarRating from '../components/StarRating';
import { downloadTicketPdf } from '../utils/downloadTicketPdf';
import { dateLocale } from '../i18n/dateLocale';

const fmt = (d) => new Date(d).toLocaleString(dateLocale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const statusStyles = {
  booked: 'bg-vibe-gradient-soft text-magenta',
  'checked-in': 'bg-ink/10 text-ink/60',
  cancelled: 'bg-red-100 text-red-600',
  refunded: 'bg-red-100 text-red-600',
};

export default function MyTickets() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState(null);
  const [active, setActive] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [ticketToCancel, setTicketToCancel] = useState(null);
  const [myRating, setMyRating] = useState(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  const load = () => api.get('/tickets/my').then(({ data }) => setTickets(data.tickets));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!active?.event?._id || active.status === 'cancelled' || new Date(active.event.endDt) > new Date()) {
      setMyRating(null);
      return;
    }
    api.get(`/reports/feedback/${active.event._id}`).then(({ data }) => setMyRating(data.feedback));
  }, [active]);

  const rateEvent = async (rating) => {
    setSubmittingRating(true);
    try {
      const { data } = await api.post('/reports/feedback', { eventId: active.event._id, rating });
      setMyRating(data.feedback);
      toast.success(t('myTickets.feedbackThanks'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingRating(false);
    }
  };

  const download = async (ticket) => {
    setDownloading(true);
    try {
      await downloadTicketPdf(ticket._id, ticket.code);
    } catch {
      toast.error(t('myTickets.downloadError'));
    } finally {
      setDownloading(false);
    }
  };

  const confirmCancel = (ticket) => {
    setTicketToCancel(ticket);
  };

  const executeCancel = async () => {
    if (!ticketToCancel) return;
    setCancelling(true);
    try {
      const { data } = await api.post(`/tickets/${ticketToCancel._id}/cancel`);
      toast.success(data.message);
      setTicketToCancel(null);
      setActive(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (!tickets) return <LoadingSpinner full />;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink">{t('myTickets.title')}</h1>
      <p className="mt-1 text-ink/60">{t('myTickets.subtitle')}</p>

      {tickets.length === 0 ? (
        <div className="card mt-10 p-12 text-center">
          <p className="font-display text-lg font-semibold text-ink">{t('myTickets.emptyTitle')}</p>
          <p className="mt-1 text-sm text-ink/60">{t('myTickets.emptyBody')}</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {tickets.map((tk) => (
            <button
              key={tk._id}
              onClick={() => setActive(tk)}
              className="card flex items-center gap-4 p-5 text-left transition hover:shadow-glow"
            >
              <div className="h-14 w-14 shrink-0 rounded-xl2 bg-vibe-gradient" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-semibold text-ink">{tk.event?.title}</p>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-ink/50">
                  <Calendar size={13} /> {fmt(tk.event?.startDt)}
                </div>
                <span className={`pill mt-2 capitalize ${statusStyles[tk.status] || 'bg-ink/10 text-ink/60'}`}>
                  {t(`ticketStatus.${tk.status}`)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-xl2 bg-white p-6 text-center shadow-glow"
            >
              <button onClick={() => setActive(null)} className="absolute right-4 top-4 text-ink/40 hover:text-ink">
                <X size={18} />
              </button>
              <p className="font-display text-lg font-semibold text-ink">{active.event?.title}</p>
              <p className="mt-1 text-sm text-ink/60">{t('myTickets.ticketSuffix', { name: active.ticketType?.name })}</p>

              {active.status !== 'cancelled' && active.status !== 'refunded' ? (
                <>
                  {active.qrDataUrl ? (
                    <img src={active.qrDataUrl} alt="Ticket QR code" className="mx-auto mt-5 h-56 w-56 rounded-xl2 border border-ink/8" />
                  ) : (
                    <div className="mx-auto mt-5 flex h-56 w-56 items-center justify-center rounded-xl2 border border-dashed border-ink/20 text-sm text-ink/40">
                      {t('myTickets.qrPending')}
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-ink/50">
                    <MapPin size={13} /> {t('myTickets.showAtVenue')}
                  </div>
                </>
              ) : (
                <div className="mx-auto mt-5 flex h-40 w-56 flex-col items-center justify-center rounded-xl2 border border-dashed border-red-200 bg-red-50/50 text-red-500">
                  <Ban size={24} className="mb-2" />
                  <p className="text-sm font-medium">Ticket {active.status}</p>
                </div>
              )}

              <span className={`pill mt-4 capitalize ${statusStyles[active.status] || 'bg-ink/10 text-ink/60'}`}>
                {t(`ticketStatus.${active.status}`)}
              </span>

              {active.status !== 'cancelled' && active.status !== 'refunded' && (
                <button
                  onClick={() => download(active)}
                  disabled={downloading}
                  className="btn-secondary mt-4 w-full !py-2.5 text-sm"
                >
                  <Download size={15} /> {downloading ? t('myTickets.preparing') : t('myTickets.downloadPdf')}
                </button>
              )}

              {active.status === 'booked' && (
                <button
                  onClick={() => confirmCancel(active)}
                  disabled={cancelling}
                  className="mt-2 w-full rounded-full border border-red-200 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50"
                >
                  <Ban size={15} className="mr-1.5 inline" /> {cancelling ? t('myTickets.cancelling') : t('myTickets.cancelTicket')}
                </button>
              )}

              {active.event?.organizer?._id && active.status !== 'cancelled' && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink/50">
                  <MessageCircle size={13} /> {t('myTickets.messageOrganizerHint')}
                </p>
              )}

              {active.status !== 'cancelled' && active.event?.endDt && new Date(active.event.endDt) < new Date() && (
                <div className="mt-4 border-t border-ink/8 pt-4">
                  <p className="text-xs font-medium text-ink/60">
                    {myRating ? t('myTickets.yourRating') : t('myTickets.rateEvent')}
                  </p>
                  <div className="mt-2 flex justify-center">
                    <StarRating
                      value={myRating?.rating || 0}
                      onChange={submittingRating ? undefined : rateEvent}
                      readOnly={submittingRating}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ticketToCancel && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="w-full max-w-sm rounded-xl2 bg-white p-6 text-center shadow-glow"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                <Ban size={24} />
              </div>
              <h3 className="font-display text-xl font-semibold text-ink">Cancel Ticket?</h3>
              <p className="mt-2 text-sm text-ink/70">
                Are you sure you want to cancel your ticket for <span className="font-semibold text-ink">{ticketToCancel.event?.title}</span>? This action cannot be undone.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => setTicketToCancel(null)} disabled={cancelling} className="btn-secondary flex-1">
                  Keep Ticket
                </button>
                <button onClick={executeCancel} disabled={cancelling} className="btn-primary flex-1 !bg-red-600 !text-white hover:!bg-red-700 !shadow-none border-0">
                  {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {active?.event?.organizer?._id && active.status !== 'cancelled' && (
        <ChatWidget
          key={active._id}
          eventId={active.event._id}
          otherUser={{ id: active.event.organizer._id, name: active.event.organizer.name }}
          eventTitle={active.event.title}
        />
      )}
    </div>
  );
}
