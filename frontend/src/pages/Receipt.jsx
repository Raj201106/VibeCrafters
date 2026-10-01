import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Download, Calendar, MapPin, Ticket as TicketIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { downloadTicketPdf } from '../utils/downloadTicketPdf';
import { dateLocale } from '../i18n/dateLocale';

const fmt = (d) =>
  new Date(d).toLocaleString(dateLocale(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function Receipt() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [downloadingId, setDownloadingId] = useState(null);
  const [booking, setBooking] = useState(state?.booking || null);
  const [loading, setLoading] = useState(!state?.booking);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (booking) {
      setLoading(false);
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const sessionId = searchParams.get('session_id');
    const paymentId = searchParams.get('payment_id');

    if (sessionId && paymentId) {
      api.post('/tickets/verify-payment', { session_id: sessionId, paymentId })
        .then((res) => {
          setBooking(res.data);
          setLoading(false);
        })
        .catch((err) => {
          setError(t('receipt.verifyError') || 'Payment verification failed.');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [location.search, booking]);

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-ink/60">Verifying your payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-red-500 font-semibold">{error}</p>
        <Link to="/events" className="btn-primary mt-6 inline-flex">
          {t('receipt.browseEvents')}
        </Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-ink/60">{t('receipt.noBooking')}</p>
        <Link to="/events" className="btn-primary mt-6 inline-flex">
          {t('receipt.browseEvents')}
        </Link>
      </div>
    );
  }

  const { tickets, payment, totalAmount, event } = booking;

  const download = async (ticket) => {
    setDownloadingId(ticket._id);
    try {
      await downloadTicketPdf(ticket._id, ticket.code);
    } catch (err) {
      toast.error(t('receipt.downloadError'));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 12 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-vibe-gradient-soft text-magenta"
        >
          <CheckCircle2 size={32} />
        </motion.div>
        <h1 className="mt-5 font-display text-2xl font-semibold text-ink">{t('receipt.confirmed')}</h1>
        <p className="mt-1 text-sm text-ink/60">
          {t('receipt.ticketCount', { count: tickets.length })} · {totalAmount > 0 ? t('receipt.paidAmount', { amount: totalAmount.toLocaleString('en-IN') }) : t('receipt.free')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="card mt-8 p-6"
      >
        <h2 className="font-display text-lg font-semibold text-ink">{event.title}</h2>
        <div className="mt-3 flex flex-wrap gap-5 text-sm text-ink/70">
          <div className="flex items-center gap-1.5">
            <Calendar size={15} className="text-magenta" /> {fmt(event.startDt)}
          </div>
          {event.venue?.name && (
            <div className="flex items-center gap-1.5">
              <MapPin size={15} className="text-magenta" /> {event.venue.name}
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-ink/40">{t('receipt.invoice', { number: payment.invoiceNumber })}</p>
      </motion.div>

      <div className="mt-6 space-y-3">
        {tickets.map((tk, i) => (
          <motion.div
            key={tk._id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05, duration: 0.35 }}
            className="card flex items-center gap-4 p-4"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-vibe-gradient-soft text-magenta">
              <TicketIcon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{t('receipt.ticketNumber', { n: i + 1 })}</p>
              <p className="text-xs text-ink/50">{t('receipt.codeLabel', { code: tk.code })}</p>
            </div>
            <button
              onClick={() => download(tk)}
              disabled={downloadingId === tk._id}
              className="btn-secondary !py-2 text-xs"
            >
              <Download size={14} /> {downloadingId === tk._id ? t('receipt.preparing') : t('receipt.pdf')}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button onClick={() => navigate('/my-tickets')} className="btn-primary flex-1">
          {t('receipt.viewMyTickets')}
        </button>
        <Link to="/events" className="btn-secondary flex-1 text-center">
          {t('receipt.browseMoreEvents')}
        </Link>
      </div>
    </div>
  );
}
