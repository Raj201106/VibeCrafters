import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Trash2, ExternalLink, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import VendorReviewCard from './VendorReviewCard';

const emptyAgenda = () => ({ time: '', title: '', speaker: '' });
const emptyTier = () => ({ name: '', price: '', quantity: '' });

/** Converts an ISO date string to the value <input type="datetime-local"> expects. */
const toLocalInput = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const statusPill = {
  draft: 'bg-ink/10 text-ink/60',
  pending_approval: 'bg-orange-100 text-orange-600',
  published: 'bg-vibe-gradient-soft text-magenta',
  completed: 'bg-ink/10 text-ink/50',
  cancelled: 'bg-red-100 text-red-600',
};

export default function EditEvent() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [form, setForm] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [venues, setVenues] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [newTier, setNewTier] = useState(emptyTier());
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingTierId, setSavingTierId] = useState(null);
  const [addingTier, setAddingTier] = useState(false);
  const [fileName, setFileName] = useState('');
  const [invitations, setInvitations] = useState([]);

  const load = () => {
    api.get(`/events/${slug}`)
      .then(async ({ data }) => {
        let eventInvitations = [];
        try {
          const invRes = await api.get(`/events/${data.event._id}/invitations`);
          eventInvitations = invRes.data.invitations;
          setInvitations(eventInvitations);
        } catch (err) {}

        const invitedVendorIds = eventInvitations.map(inv => inv.vendor?._id || inv.vendor);
        const acceptedVendorIds = (data.event.vendors || []).map((v) => v._id);
        const allCheckedVendorIds = [...new Set([...invitedVendorIds, ...acceptedVendorIds])];

        setEvent(data.event);
        setForm({
          title: data.event.title,
          description: data.event.description,
          category: data.event.category,
          bannerUrl: data.event.bannerUrl || '',
          venue: data.event.venue?._id || '',
          vendors: allCheckedVendorIds,
          startDt: toLocalInput(data.event.startDt),
          endDt: toLocalInput(data.event.endDt),
          agenda: data.event.agenda?.length ? data.event.agenda : [emptyAgenda()],
        });
        setTiers(data.ticketTypes.map((tt) => ({ ...tt, _dirty: false })));
      })
      .catch((err) => toast.error(err.message || t('editEvent.loadError')));
  };

  useEffect(load, [slug]);
  useEffect(() => {
    api.get('/venues').then(({ data }) => setVenues(data.venues)).catch(() => setVenues([]));
    api.get('/vendors').then(({ data }) => setVendors(data.vendors)).catch(() => setVendors([]));
  }, []);

  if (!event || !form) return <LoadingSpinner full />;

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const toggleVendor = (id) => {
    setForm((f) => ({
      ...f,
      vendors: f.vendors.includes(id) ? f.vendors.filter((v) => v !== id) : [...f.vendors, id],
    }));
  };

  const saveDetails = async () => {
    setSavingDetails(true);
    try {
      await api.put(`/events/${event._id}`, {
        ...form,
        venue: form.venue || null, // null (not undefined) so the backend can tell "clear it" apart from "not sent"
        agenda: form.agenda.filter((a) => a.title),
      });
      toast.success(t('editEvent.detailsUpdatedToast'));
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingDetails(false);
    }
  };

  const payVendor = async (bookingId) => {
    try {
      const { data } = await api.post(`/vendors/gigs/${bookingId}/pay`);
      if (data.stripeUrl) window.location.href = data.stripeUrl;
    } catch (err) {
      toast.error(err.message || 'Payment initiation failed');
    }
  };

  const rejectQuote = async (bookingId) => {
    try {
      await api.patch(`/vendors/gigs/${bookingId}/reject`);
      toast.success('Vendor quote rejected');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to reject quote');
    }
  };

  const updateTierField = (id, field, value) =>
    setTiers((prev) => prev.map((tt) => (tt._id === id ? { ...tt, [field]: value, _dirty: true } : tt)));

  const saveTier = async (tier) => {
    setSavingTierId(tier._id);
    try {
      await api.put(`/events/${event._id}/ticket-types/${tier._id}`, {
        name: tier.name,
        price: Number(tier.price),
        quantity: Number(tier.quantity),
      });
      toast.success(t('editEvent.tierUpdatedToast', { name: tier.name }));
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingTierId(null);
    }
  };

  const deleteTier = async (tier) => {
    if (tier.quantitySold > 0) {
      return toast.error(t('editEvent.tierDeleteBlockedToast', { count: tier.quantitySold }));
    }
    if (!confirm(t('editEvent.tierDeleteConfirm', { name: tier.name }))) return;
    try {
      await api.delete(`/events/${event._id}/ticket-types/${tier._id}`);
      toast.success(t('editEvent.tierDeletedToast'));
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addTier = async () => {
    if (!newTier.name || !newTier.price || !newTier.quantity) {
      return toast.error(t('editEvent.fillTierFields'));
    }
    setAddingTier(true);
    try {
      await api.post(`/events/${event._id}/ticket-types`, {
        name: newTier.name,
        price: Number(newTier.price),
        quantity: Number(newTier.quantity),
      });
      toast.success(t('editEvent.tierAddedToast'));
      setNewTier(emptyTier());
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingTier(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const formData = new FormData();
    formData.append('image', file);
    
    toast.promise(
      api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
      {
        loading: 'Uploading image...',
        success: (res) => {
          update({ bannerUrl: res.data.url });
          return 'Image uploaded successfully!';
        },
        error: 'Failed to upload image'
      }
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{t('editEvent.title')}</h1>
          <p className="mt-1 text-ink/60">{t('editEvent.subtitle')}</p>
        </div>
        <span className={`pill mt-1 capitalize ${statusPill[event.status]}`}>
          {event.status === 'pending_approval' ? 'Pending' : t(`eventStatus.${event.status}`)}
        </span>
      </div>

      {event.status === 'published' && (
        <Link
          to={`/events/${event.slug}`}
          target="_blank"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-magenta hover:underline"
        >
          {t('editEvent.viewPublicPage')} <ExternalLink size={14} />
        </Link>
      )}

      <VendorReviewCard event={event} />

      {/* Details */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card mt-6 space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold text-ink">{t('editEvent.detailsHeading')}</h2>
        <div>
          <label className="label">{t('createEvent.eventTitle')}</label>
          <input className="input" value={form.title} onChange={(e) => update({ title: e.target.value })} />
        </div>
        <div>
          <label className="label">{t('createEvent.description')}</label>
          <textarea
            className="input min-h-28"
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('createEvent.category')}</label>
            <select className="input" value={form.category} onChange={(e) => update({ category: e.target.value })}>
              {['conference', 'concert', 'wedding', 'corporate', 'festival', 'workshop', 'other'].map((c) => (
                <option key={c} value={c}>{t(`categories.${c}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Banner image</label>
            <div className="mt-1 flex flex-col gap-2">
              <input
                id="banner-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <label htmlFor="banner-upload" className="btn-secondary cursor-pointer inline-block text-center w-full">
                Choose File
              </label>
            </div>
            {fileName && (
              <p className="mt-1.5 text-xs font-medium text-magenta truncate">{fileName}</p>
            )}
          </div>
        </div>
        {form.bannerUrl && (
          <img src={form.bannerUrl} alt="Banner preview" className="h-36 w-full rounded-xl2 object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('createEvent.startDt')}</label>
            <input type="datetime-local" className="input" value={form.startDt} onChange={(e) => update({ startDt: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('createEvent.endDt')}</label>
            <input type="datetime-local" className="input" value={form.endDt} onChange={(e) => update({ endDt: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="label">{t('editEvent.venueLabel')}</label>
          <select className="input" value={form.venue} onChange={(e) => update({ venue: e.target.value })}>
            <option value="">{t('createEvent.noVenueSelected')}</option>
            {venues.map((v) => (
              <option key={v._id} value={v._id}>{t('createEvent.venueOption', { name: v.name, city: v.city, capacity: v.capacity })}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label flex items-center gap-1.5"><Store size={13} /> {t('editEvent.vendorsLabel')}</label>
          {vendors.length === 0 ? (
            <p className="text-xs text-ink/50">{t('createEvent.noVendorsYet')}</p>
          ) : (
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {vendors.map((v) => (
                <label
                  key={v._id}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm transition ${
                    form.vendors.includes(v._id) ? 'border-magenta bg-vibe-gradient-soft' : 'border-ink/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.vendors.includes(v._id)}
                    onChange={() => toggleVendor(v._id)}
                    className="accent-magenta"
                  />
                  <span>
                    <span className="font-medium text-ink">{v.name}</span>{' '}
                    <span className="capitalize text-ink/50">— {t(`serviceTypes.${v.serviceType}`)}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {invitations.length > 0 && (
          <div className="mt-6">
            <label className="label">Sent Invitations Status</label>
            <div className="mt-2 space-y-2">
              {invitations.map(inv => (
                <div key={inv._id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-ink/10 p-3 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-ink">{inv.vendor?.name}</p>
                      <span className={`pill text-xs capitalize ${inv.status === 'pending' ? 'bg-ink/10 text-ink/60' : inv.status === 'quoted' ? 'bg-amber-100 text-amber-700' : inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'accepted' ? 'bg-vibe-gradient-soft text-magenta' : 'bg-red-100 text-red-600'}`}>
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-xs text-ink/50 capitalize mt-0.5">{inv.vendor?.serviceType}</p>
                    {inv.status === 'quoted' && (
                      <div className="mt-2 text-sm text-ink/80">
                        <p className="font-medium text-ink">Quoted Price: ${inv.quotedPrice}</p>
                        {inv.quoteMessage && <p className="italic text-ink/60 mt-1">"{inv.quoteMessage}"</p>}
                      </div>
                    )}
                  </div>
                  {inv.status === 'quoted' && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button onClick={() => payVendor(inv._id)} className="btn-primary py-1.5 px-4 text-xs whitespace-nowrap">
                        Accept & Pay
                      </button>
                      <button onClick={() => rejectQuote(inv._id)} className="btn-secondary py-1.5 px-4 text-xs whitespace-nowrap text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200 hover:border-red-300">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label">{t('createEvent.stepAgenda')}</label>
          <div className="space-y-2">
            {form.agenda.map((a, i) => (
              <div key={i} className="flex gap-2">
                <input className="input w-24" placeholder={t('createEvent.timePlaceholder')} value={a.time} onChange={(e) => {
                  const agenda = [...form.agenda]; agenda[i].time = e.target.value; update({ agenda });
                }} />
                <input className="input flex-1" placeholder={t('createEvent.sessionTitlePlaceholder')} value={a.title} onChange={(e) => {
                  const agenda = [...form.agenda]; agenda[i].title = e.target.value; update({ agenda });
                }} />
                <input className="input flex-1" placeholder={t('createEvent.speakerPlaceholder')} value={a.speaker} onChange={(e) => {
                  const agenda = [...form.agenda]; agenda[i].speaker = e.target.value; update({ agenda });
                }} />
                <button onClick={() => update({ agenda: form.agenda.filter((_, j) => j !== i) })} className="rounded-xl border border-ink/10 p-2.5 text-ink/40 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button onClick={() => update({ agenda: [...form.agenda, emptyAgenda()] })} className="btn-secondary !py-2 text-xs">
              <Plus size={14} /> {t('createEvent.addSession')}
            </button>
          </div>
        </div>

        <button onClick={saveDetails} disabled={savingDetails} className="btn-primary">
          {savingDetails ? t('createEvent.saving') : t('editEvent.saveDetails')}
        </button>
      </motion.div>

      {/* Ticket tiers */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card mt-6 space-y-3 p-6">
        <h2 className="font-display text-lg font-semibold text-ink">{t('editEvent.ticketTiersHeading')}</h2>

        {tiers.map((tier) => (
          <div key={tier._id} className="flex items-center gap-2 rounded-xl2 border border-ink/10 p-3">
            <input className="input flex-1" value={tier.name} onChange={(e) => updateTierField(tier._id, 'name', e.target.value)} />
            <input type="number" className="input w-24" value={tier.price} onChange={(e) => updateTierField(tier._id, 'price', e.target.value)} />
            <input type="number" className="input w-24" value={tier.quantity} onChange={(e) => updateTierField(tier._id, 'quantity', e.target.value)} />
            <span className="w-20 shrink-0 text-xs text-ink/50">{t('editEvent.soldCount', { count: tier.quantitySold })}</span>
            <button
              onClick={() => saveTier(tier)}
              disabled={savingTierId === tier._id}
              className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-semibold text-magenta hover:bg-ink/5"
            >
              {savingTierId === tier._id ? t('createEvent.saving') : t('editEvent.save')}
            </button>
            <button onClick={() => deleteTier(tier)} className="rounded-xl border border-ink/10 p-2.5 text-ink/40 hover:text-red-500">
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2 rounded-xl2 border border-dashed border-ink/20 p-3">
          <input className="input flex-1" placeholder={t('editEvent.newTierNamePlaceholder')} value={newTier.name} onChange={(e) => setNewTier({ ...newTier, name: e.target.value })} />
          <input type="number" className="input w-24" placeholder={t('editEvent.pricePlaceholder')} value={newTier.price} onChange={(e) => setNewTier({ ...newTier, price: e.target.value })} />
          <input type="number" className="input w-24" placeholder={t('createEvent.qtyPlaceholder')} value={newTier.quantity} onChange={(e) => setNewTier({ ...newTier, quantity: e.target.value })} />
          <button onClick={addTier} disabled={addingTier} className="btn-secondary !py-2 text-xs">
            <Plus size={14} /> {t('editEvent.add')}
          </button>
        </div>
      </motion.div>

      <button onClick={() => navigate('/organizer')} className="mt-6 text-sm font-medium text-ink/60 hover:text-ink">
        {t('editEvent.backToDashboard')}
      </button>
    </div>
  );
}
