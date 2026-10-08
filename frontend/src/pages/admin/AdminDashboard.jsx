import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DollarSign, Calendar, Ticket, UserCheck, Megaphone, Send, Mail, Store, CheckCircle2, Clock, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import AnimatedCounter from '../../components/AnimatedCounter';
import StarRating from '../../components/StarRating';
import { dateLocale } from '../../i18n/dateLocale';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [kpis, setKpis] = useState(null);
  const [trend, setTrend] = useState(null);
  const [contacts, setContacts] = useState(null);
  const [vendors, setVendors] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [promo, setPromo] = useState({ headline: '', message: '', ctaLabel: '', ctaUrl: '' });
  const [sending, setSending] = useState(false);
  const [pendingEvents, setPendingEvents] = useState(null);

  const loadVendors = () => api.get('/vendors').then(({ data }) => setVendors(data.vendors));
  const loadPendingEvents = () => api.get('/events?status=pending_approval').then(({ data }) => setPendingEvents(data.events));

  useEffect(() => {
    api.get('/reports/overview').then(({ data }) => setKpis(data.kpis));
    api.get('/reports/sales-trend').then(({ data }) =>
      setTrend(data.trend.map((row) => ({ date: row._id.slice(5), revenue: row.revenue })))
    );
    api.get('/contact').then(({ data }) => setContacts(data.contacts)).catch(() => setContacts([]));
    loadVendors();
    loadPendingEvents();
  }, []);

  const approveEvent = async (eventId) => {
    try {
      await api.patch(`/events/${eventId}/status`, { status: 'published' });
      toast.success('Event approved and published successfully.');
      loadPendingEvents();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const approveVendor = async (vendor) => {
    setApprovingId(vendor._id);
    try {
      await api.patch(`/vendors/${vendor._id}/approve`);
      toast.success(t('adminDashboard.approvedToast', { name: vendor.name }));
      loadVendors();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setApprovingId(null);
    }
  };

  const rateVendor = async (vendor, rating) => {
    // Optimistic update — the directory sort order elsewhere depends on this field, so a
    // snappy response here matters more than for most admin actions.
    setVendors((prev) => prev.map((v) => (v._id === vendor._id ? { ...v, rating } : v)));
    try {
      await api.put(`/vendors/${vendor._id}`, { rating });
    } catch (err) {
      toast.error(err.message);
      loadVendors(); // roll back to server truth on failure
    }
  };

  const sendPromo = async (e) => {
    e.preventDefault();
    if (!promo.message.trim()) return toast.error(t('adminDashboard.writeMessageFirst'));
    setSending(true);
    try {
      const { data } = await api.post('/promotions/send', { ...promo, audience: 'attendees' });
      toast.success(data.message);
      setPromo({ headline: '', message: '', ctaLabel: '', ctaUrl: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  if (!kpis || !trend) return <LoadingSpinner full />;

  const cards = [
    { label: t('adminDashboard.cardTotalRevenue'), value: kpis.totalRevenue, prefix: '₹', icon: DollarSign },
    { label: t('adminDashboard.cardEvents'), value: kpis.totalEvents, icon: Calendar },
    { label: t('adminDashboard.cardTicketsSold'), value: kpis.totalTicketsSold, icon: Ticket },
    { label: t('adminDashboard.cardCheckIns'), value: kpis.totalCheckIns, icon: UserCheck },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{t('adminDashboard.title')}</h1>
          <p className="mt-1 text-ink/60">{t('adminDashboard.subtitle')}</p>
        </div>
        <Link to="/admin/users" className="btn-secondary">
          <Users size={16} /> {t('adminDashboard.manageUsers')}
        </Link>
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

      <div className="card mt-8 p-6">
        <h2 className="font-display text-lg font-semibold text-ink">{t('adminDashboard.revenueTrend')}</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C81E6E" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#F5811F" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#0F2A3D" strokeOpacity={0.06} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#0F2A3D99' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#0F2A3D99' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #0F2A3D14', fontSize: 13 }}
                formatter={(v) => [`₹${v}`, t('adminDashboard.revenue')]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#C81E6E" strokeWidth={2.5} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {trend.length === 0 && <p className="mt-2 text-center text-sm text-ink/40">{t('adminDashboard.noTransactions')}</p>}
      </div>

      <div className="card mt-8 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Store size={18} className="text-magenta" /> {t('adminDashboard.vendorApprovals')}
        </h2>
        <p className="mt-1 text-sm text-ink/60">{t('adminDashboard.vendorApprovalsBody')}</p>

        {vendors === null ? (
          <LoadingSpinner />
        ) : vendors.length === 0 ? (
          <p className="mt-4 text-sm text-ink/40">{t('adminDashboard.noVendors')}</p>
        ) : (
          <div className="mt-4 space-y-2">
            {vendors.map((v) => (
              <div key={v._id} className="flex items-center justify-between rounded-xl2 border border-ink/8 p-4">
                <div>
                  <p className="text-sm font-semibold text-ink">{v.name}</p>
                  <p className="text-xs capitalize text-ink/50">{t(`serviceTypes.${v.serviceType}`)} · {v.contactEmail}</p>
                </div>
                <div className="flex items-center gap-4">
                  <StarRating value={v.rating || 0} onChange={(n) => rateVendor(v, n)} size={16} />
                  {v.approved ? (
                    <span className="pill flex items-center gap-1 bg-vibe-gradient-soft text-magenta">
                      <CheckCircle2 size={12} /> {t('adminDashboard.approved')}
                    </span>
                  ) : (
                    <button
                      onClick={() => approveVendor(v)}
                      disabled={approvingId === v._id}
                      className="pill flex items-center gap-1 bg-ink/10 text-ink/60 transition hover:bg-vibe-gradient hover:text-white"
                    >
                      <Clock size={12} /> {approvingId === v._id ? t('adminDashboard.approving') : t('adminDashboard.approve')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mt-8 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Calendar size={18} className="text-magenta" /> Event Approvals
        </h2>
        <p className="mt-1 text-sm text-ink/60">Review and publish events submitted by organizers.</p>

        {pendingEvents === null ? (
          <LoadingSpinner />
        ) : pendingEvents.length === 0 ? (
          <p className="mt-4 text-sm text-ink/40">No events pending approval.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {pendingEvents.map((ev) => (
              <div key={ev._id} className="flex items-center justify-between rounded-xl2 border border-ink/8 p-4">
                <div>
                  <p className="text-sm font-semibold text-ink">{ev.title}</p>
                  <p className="text-xs capitalize text-ink/50">{t(`categories.${ev.category}`)} · {ev.organizer?.name}</p>
                  <Link to={`/events/${ev.slug}`} target="_blank" className="text-xs text-magenta hover:underline">Preview Event</Link>
                </div>
                <button
                  onClick={() => approveEvent(ev._id)}
                  className="pill flex items-center gap-1 bg-ink/10 text-ink/60 transition hover:bg-vibe-gradient hover:text-white"
                >
                  <CheckCircle2 size={12} /> Approve & Publish
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mt-8 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Megaphone size={18} className="text-magenta" /> {t('adminDashboard.sendOffer')}
        </h2>
        <p className="mt-1 text-sm text-ink/60">{t('adminDashboard.sendOfferBody')}</p>
        <form onSubmit={sendPromo} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            className="input sm:col-span-2"
            placeholder={t('adminDashboard.headlinePlaceholder')}
            value={promo.headline}
            onChange={(e) => setPromo({ ...promo, headline: e.target.value })}
          />
          <textarea
            className="input min-h-24 sm:col-span-2"
            placeholder={t('adminDashboard.messagePlaceholder')}
            value={promo.message}
            onChange={(e) => setPromo({ ...promo, message: e.target.value })}
          />
          <input
            className="input"
            placeholder={t('adminDashboard.buttonLabelPlaceholder')}
            value={promo.ctaLabel}
            onChange={(e) => setPromo({ ...promo, ctaLabel: e.target.value })}
          />
          <input
            className="input"
            placeholder={t('adminDashboard.linkPlaceholder')}
            value={promo.ctaUrl}
            onChange={(e) => setPromo({ ...promo, ctaUrl: e.target.value })}
          />
          <button type="submit" disabled={sending} className="btn-primary sm:col-span-2">
            <Send size={16} /> {sending ? t('adminDashboard.sending') : t('adminDashboard.sendToAll')}
          </button>
        </form>
      </div>

      <div className="card mt-8 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Mail size={18} className="text-magenta" /> {t('adminDashboard.contactMessages')}
        </h2>
        <p className="mt-1 text-sm text-ink/60">{t('adminDashboard.contactMessagesBody')}</p>

        {contacts === null ? (
          <LoadingSpinner />
        ) : contacts.length === 0 ? (
          <p className="mt-4 text-sm text-ink/40">{t('adminDashboard.noMessages')}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {contacts.map((c) => (
              <div key={c._id} className="rounded-xl2 border border-ink/8 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">{c.name} · <span className="font-normal text-ink/50">{c.email}</span></p>
                  <span className="text-xs text-ink/40">{new Date(c.createdAt).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric' })}</span>
                </div>
                {c.subject && <p className="mt-1 text-xs font-medium text-magenta">{c.subject}</p>}
                <p className="mt-1.5 text-sm text-ink/70">{c.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
