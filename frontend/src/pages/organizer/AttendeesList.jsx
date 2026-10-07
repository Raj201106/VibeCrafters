import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Mail, Phone, MessageCircle, ScanLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import ChatWidget from '../../components/ChatWidget';
import { dateLocale } from '../../i18n/dateLocale';

const statusPill = {
  booked: 'bg-vibe-gradient-soft text-magenta',
  'checked-in': 'bg-ink/10 text-ink/60',
  cancelled: 'bg-red-100 text-red-600',
  refunded: 'bg-red-100 text-red-600',
};

const fmt = (d) => new Date(d).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric', year: 'numeric' });

export default function AttendeesList() {
  const { t } = useTranslation();
  const { eventId } = useParams();
  const [data, setData] = useState(null);
  const [chatWith, setChatWith] = useState(null);
  const [ticketToRefund, setTicketToRefund] = useState(null);
  const [refunding, setRefunding] = useState(false);
  const [ticketToCancel, setTicketToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const [filter, setFilter] = useState('all');

  useEffect(() => {
    load();
  }, [eventId]);

  const load = () => {
    api.get(`/events/${eventId}/attendees`).then(({ data }) => setData(data));
  };

  const handleRefund = async () => {
    if (!ticketToRefund) return;
    setRefunding(true);
    try {
      await api.post(`/tickets/${ticketToRefund}/refund`);
      toast.success('Ticket refunded successfully!');
      setTicketToRefund(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Refund failed');
    } finally {
      setRefunding(false);
    }
  };

  const handleCancel = async () => {
    if (!ticketToCancel) return;
    setCancelling(true);
    try {
      await api.post(`/tickets/${ticketToCancel}/cancel`);
      toast.success('Ticket cancelled successfully!');
      setTicketToCancel(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  };

  if (!data) return <LoadingSpinner full />;

  const { event, attendees } = data;
  const totalRevenue = attendees
    .filter((a) => a.status !== 'cancelled' && a.status !== 'refunded')
    .reduce((sum, a) => sum + a.priceAtPurchase, 0);

  const filteredAttendees = attendees.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'cancelled') return a.status === 'cancelled' || a.status === 'refunded';
    return a.status === filter;
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between">
        <Link to="/organizer" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/60 hover:text-ink">
          <ArrowLeft size={15} /> {t('attendeesList.backToDashboard')}
        </Link>
        <Link to="/organizer/scan" className="btn-secondary !py-2 text-sm">
          <ScanLine size={15} /> {t('attendeesList.scanTickets')}
        </Link>
      </div>

      <h1 className="mt-4 font-display text-3xl font-semibold text-ink">{t('attendeesList.title')}</h1>
      <p className="mt-1 text-ink/60">{event.title}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="font-display text-2xl font-semibold text-ink">
            {attendees.filter((a) => a.status !== 'cancelled' && a.status !== 'refunded').length}
          </p>
          <p className="text-sm text-ink/50">{t('attendeesList.ticketsBooked')}</p>
        </div>
        <div className="card p-5">
          <p className="font-display text-2xl font-semibold text-ink">
            {attendees.filter((a) => a.status === 'checked-in').length}
          </p>
          <p className="text-sm text-ink/50">{t('attendeesList.checkedIn')}</p>
        </div>
        <div className="card p-5">
          <p className="font-display text-2xl font-semibold text-ink">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-sm text-ink/50">{t('attendeesList.revenueFromEvent')}</p>
        </div>
      </div>

      <div className="mt-8 flex gap-2 border-b border-ink/8 pb-4">
        {['all', 'booked', 'checked-in', 'cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === tab ? 'bg-ink text-white' : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
            }`}
          >
            {tab === 'cancelled' ? 'Cancelled / Refunded' : tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {filteredAttendees.length === 0 ? (
        <div className="card mt-6 p-12 text-center">
          <p className="text-ink/60">No attendees match this filter.</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 overflow-hidden rounded-xl2 border border-ink/8 bg-white"
        >
          <table className="w-full text-left text-sm">
            <thead className="bg-ink/[0.03] text-ink/50">
              <tr>
                <th className="px-5 py-3 font-medium">{t('attendeesList.colAttendee')}</th>
                <th className="px-5 py-3 font-medium">{t('attendeesList.colTier')}</th>
                <th className="px-5 py-3 font-medium">{t('attendeesList.colPaid')}</th>
                <th className="px-5 py-3 font-medium">{t('attendeesList.colBookedOn')}</th>
                <th className="px-5 py-3 font-medium">{t('attendeesList.colStatus')}</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendees.map((a) => (
                <tr key={a._id} className="border-t border-ink/6">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{a.user?.name}</p>
                    <p className="flex items-center gap-1 text-xs text-ink/50">
                      <Mail size={11} /> {a.user?.email}
                    </p>
                    {a.user?.phone && (
                      <p className="flex items-center gap-1 text-xs text-ink/50">
                        <Phone size={11} /> {a.user.phone}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink/70">{a.ticketType?.name}</td>
                  <td className="px-5 py-3 font-medium text-ink">₹{a.priceAtPurchase.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 text-ink/60">{fmt(a.createdAt)}</td>
                  <td className="px-5 py-3">
                    <span className={`pill capitalize ${statusPill[a.status] || 'bg-ink/10 text-ink/60'}`}>{t(`ticketStatus.${a.status}`)}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {a.status !== 'cancelled' && a.status !== 'refunded' && a.user?._id && (
                        <button
                          onClick={() => setChatWith({ id: a.user._id, name: a.user.name })}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-magenta hover:underline"
                        >
                          <MessageCircle size={13} /> {t('attendeesList.message')}
                        </button>
                      )}
                      {a.status === 'booked' && (
                        <button
                          onClick={() => setTicketToCancel(a._id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-600 hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                      {a.status === 'cancelled' && (
                        <button
                          onClick={() => setTicketToRefund(a._id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:underline"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {chatWith && (
        <ChatWidget key={chatWith.id} eventId={eventId} otherUser={chatWith} eventTitle={event.title} />
      )}

      {ticketToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-6 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm rounded-xl2 bg-white p-6 text-center shadow-glow"
          >
            <h3 className="font-display text-xl font-semibold text-ink">Cancel Ticket?</h3>
            <p className="mt-2 text-sm text-ink/70">
              This will cancel the ticket and release the seat. Revenue will be deducted from your dashboard immediately.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setTicketToCancel(null)} disabled={cancelling} className="btn-secondary flex-1">
                Keep Ticket
              </button>
              <button onClick={handleCancel} disabled={cancelling} className="btn-primary flex-1 !bg-red-600 !text-white hover:!bg-red-700 border-0">
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {ticketToRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-6 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm rounded-xl2 bg-white p-6 text-center shadow-glow"
          >
            <h3 className="font-display text-xl font-semibold text-ink">Confirm Refund</h3>
            <p className="mt-2 text-sm text-ink/70">
              Are you sure you want to refund this ticket? The amount will be returned to the attendee's original payment method.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setTicketToRefund(null)} disabled={refunding} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleRefund} disabled={refunding} className="btn-primary flex-1 !bg-red-600 !text-white hover:!bg-red-700 border-0">
                {refunding ? 'Refunding...' : 'Confirm Refund'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
