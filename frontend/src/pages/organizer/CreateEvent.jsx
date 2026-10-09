import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronLeft, ChevronRight, Plus, Trash2, MapPin, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';

const emptyTicket = () => ({ name: '', price: '', quantity: '' });
const emptyAgenda = () => ({ time: '', title: '', speaker: '' });

export default function CreateEvent() {
  const { t } = useTranslation();
  const steps = [t('createEvent.stepDetails'), t('createEvent.stepSchedule'), t('createEvent.stepAgenda'), t('createEvent.stepTickets')];
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [venues, setVenues] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'conference',
    bannerUrl: '',
    venue: '',
    vendors: [],
    startDt: '',
    endDt: '',
    agenda: [emptyAgenda()],
    ticketTypes: [emptyTicket()],
  });

  useEffect(() => {
    api.get('/venues').then(({ data }) => setVenues(data.venues)).catch(() => setVenues([]));
    // Only approved vendors come back for a non-admin caller (see listVendors), so this is
    // already naturally scoped to vendors an organizer should be able to book.
    api.get('/vendors').then(({ data }) => setVendors(data.vendors)).catch(() => setVendors([]));
  }, []);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const toggleVendor = (id) => {
    setForm((f) => ({
      ...f,
      vendors: f.vendors.includes(id) ? f.vendors.filter((v) => v !== id) : [...f.vendors, id],
    }));
  };

  const canNext = () => {
    if (step === 0) return form.title && form.description;
    if (step === 1) return form.startDt && form.endDt;
    return true;
  };

  const submit = async () => {
    setBusy(true);
    try {
      const payload = {
        ...form,
        venue: form.venue || undefined, // empty string would fail Mongoose ObjectId casting
        ticketTypes: form.ticketTypes
          .filter((tk) => tk.name && tk.price && tk.quantity)
          .map((tk) => ({ name: tk.name, price: Number(tk.price), quantity: Number(tk.quantity) })),
        agenda: form.agenda.filter((a) => a.title),
      };
      const { data } = await api.post('/events', payload);
      toast.success(t('createEvent.createdToast'));
      navigate('/organizer');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
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
      <h1 className="font-display text-3xl font-semibold text-ink">{t('createEvent.title')}</h1>
      <p className="mt-1 text-ink/60">{t('createEvent.subtitle')}</p>

      {/* Step indicator */}
      <div className="mt-8 flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                i < step ? 'bg-vibe-gradient text-white' : i === step ? 'border-2 border-magenta text-magenta' : 'border border-ink/15 text-ink/40'
              }`}
            >
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={`hidden text-xs font-medium sm:block ${i === step ? 'text-ink' : 'text-ink/40'}`}>{label}</span>
            {i < steps.length - 1 && <div className="h-px flex-1 bg-ink/10" />}
          </div>
        ))}
      </div>

      <div className="card mt-8 overflow-hidden p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="label">{t('createEvent.eventTitle')}</label>
                  <input className="input" value={form.title} onChange={(e) => update({ title: e.target.value })} placeholder={t('createEvent.eventTitlePlaceholder')} />
                </div>
                <div>
                  <label className="label">{t('createEvent.description')}</label>
                  <textarea
                    className="input min-h-32"
                    value={form.description}
                    onChange={(e) => update({ description: e.target.value })}
                    placeholder={t('createEvent.descriptionPlaceholder')}
                  />
                </div>
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
                  {fileName ? (
                    <p className="mt-1.5 text-xs font-medium text-magenta truncate">{fileName}</p>
                  ) : (
                    <p className="mt-1.5 text-xs text-ink/50">Upload a banner image from your device.</p>
                  )}
                  {form.bannerUrl && (
                    <img
                      src={form.bannerUrl}
                      alt="Banner preview"
                      className="mt-3 h-36 w-full rounded-xl2 object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="label">{t('createEvent.startDt')}</label>
                  <input type="datetime-local" className="input" value={form.startDt} onChange={(e) => update({ startDt: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('createEvent.endDt')}</label>
                  <input type="datetime-local" className="input" value={form.endDt} onChange={(e) => update({ endDt: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('createEvent.venueOptional')}</label>
                  <select className="input" value={form.venue} onChange={(e) => update({ venue: e.target.value })}>
                    <option value="">{t('createEvent.noVenueSelected')}</option>
                    {venues.map((v) => (
                      <option key={v._id} value={v._id}>{t('createEvent.venueOption', { name: v.name, city: v.city, capacity: v.capacity })}</option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-ink/50">
                    {t('createEvent.noVenueHint')} <Link to="/organizer/venues" target="_blank" className="text-magenta hover:underline">{t('createEvent.addToDirectory')}</Link> {t('createEvent.thenComeBack')}
                  </p>
                </div>
                <div>
                  <label className="label flex items-center gap-1.5"><Store size={13} /> {t('createEvent.vendorsOptional')}</label>
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
                  <p className="mt-1.5 text-xs text-ink/50">
                    {t('createEvent.vendorHint1')}{' '}
                    <Link to="/vendor" target="_blank" className="text-magenta hover:underline">{t('createEvent.vendorDirectory')}</Link>.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                {form.agenda.map((a, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-2">
                    <input className="input w-full sm:w-32 shrink-0" placeholder={t('createEvent.timePlaceholder')} value={a.time} onChange={(e) => {
                      const agenda = [...form.agenda]; agenda[i].time = e.target.value; update({ agenda });
                    }} />
                    <input className="input flex-1" placeholder={t('createEvent.sessionTitlePlaceholder')} value={a.title} onChange={(e) => {
                      const agenda = [...form.agenda]; agenda[i].title = e.target.value; update({ agenda });
                    }} />
                    <input className="input flex-1" placeholder={t('createEvent.speakerPlaceholder')} value={a.speaker} onChange={(e) => {
                      const agenda = [...form.agenda]; agenda[i].speaker = e.target.value; update({ agenda });
                    }} />
                    <button onClick={() => update({ agenda: form.agenda.filter((_, j) => j !== i) })} className="rounded-xl border border-ink/10 p-2.5 text-ink/40 hover:text-red-500 flex justify-center w-full sm:w-auto shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button onClick={() => update({ agenda: [...form.agenda, emptyAgenda()] })} className="btn-secondary !py-2 text-xs">
                  <Plus size={14} /> {t('createEvent.addSession')}
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                {form.ticketTypes.map((ticket, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="input flex-1" placeholder={t('createEvent.tierNamePlaceholder')} value={ticket.name} onChange={(e) => {
                      const tt = [...form.ticketTypes]; tt[i].name = e.target.value; update({ ticketTypes: tt });
                    }} />
                    <input type="number" className="input w-28" placeholder={t('createEvent.pricePlaceholder')} value={ticket.price} onChange={(e) => {
                      const tt = [...form.ticketTypes]; tt[i].price = e.target.value; update({ ticketTypes: tt });
                    }} />
                    <input type="number" className="input w-28" placeholder={t('createEvent.qtyPlaceholder')} value={ticket.quantity} onChange={(e) => {
                      const tt = [...form.ticketTypes]; tt[i].quantity = e.target.value; update({ ticketTypes: tt });
                    }} />
                    <button onClick={() => update({ ticketTypes: form.ticketTypes.filter((_, j) => j !== i) })} className="rounded-xl border border-ink/10 p-2.5 text-ink/40 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button onClick={() => update({ ticketTypes: [...form.ticketTypes, emptyTicket()] })} className="btn-secondary !py-2 text-xs">
                  <Plus size={14} /> {t('createEvent.addTicketTier')}
                </button>
                <p className="text-xs text-ink/50">{t('createEvent.ticketTierHint')}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="btn-secondary disabled:opacity-30"
        >
          <ChevronLeft size={16} /> {t('createEvent.back')}
        </button>
        {step < steps.length - 1 ? (
          <button onClick={() => setStep((s) => s + 1)} disabled={!canNext()} className="btn-primary">
            {t('createEvent.next')} <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={submit} disabled={busy} className="btn-primary">
            {busy ? t('createEvent.saving') : t('createEvent.saveAsDraft')}
          </button>
        )}
      </div>
    </div>
  );
}
