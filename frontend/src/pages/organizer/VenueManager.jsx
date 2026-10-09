import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, MapPin, Users, Plus, X, Pencil, Trash2, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import TiltCard from '../../components/TiltCard';
import ConfirmModal from '../../components/ConfirmModal';

const emptyForm = { name: '', address: '', city: '', capacity: '', amenities: '', photos: [''] };

const toFormValues = (v) => ({
  name: v.name,
  address: v.address,
  city: v.city,
  capacity: String(v.capacity),
  amenities: (v.amenities || []).join(', '),
  photos: v.photos?.length ? v.photos : [''],
});

export default function VenueManager() {
  const { t } = useTranslation();
  const [venues, setVenues] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = adding new, id = editing existing
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirm, setConfirm] = useState({ isOpen: false, action: null, title: '', message: '', confirmText: 'Confirm' });

  const load = () => api.get('/venues').then(({ data }) => setVenues(data.venues));
  useEffect(load, []);

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (venue) => {
    setEditingId(venue._id);
    setForm(toFormValues(venue));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        address: form.address,
        city: form.city,
        capacity: Number(form.capacity),
        amenities: form.amenities
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        photos: form.photos.map((p) => p.trim()).filter(Boolean),
      };

      if (editingId) {
        await api.put(`/venues/${editingId}`, payload);
        toast.success(t('venueManager.venueUpdated'));
      } else {
        await api.post('/venues', payload);
        toast.success(t('venueManager.venueAdded'));
      }
      closeForm();
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (venue) => {
    setConfirm({
      isOpen: true,
      title: 'Delete Venue',
      message: t('venueManager.deleteConfirm', { name: venue.name }),
      confirmText: 'Delete',
      action: async () => {
        setDeletingId(venue._id);
        try {
          await api.delete(`/venues/${venue._id}`);
          toast.success(t('venueManager.venueDeleted'));
          setVenues((prev) => prev.filter((v) => v._id !== venue._id));
        } catch (err) {
          toast.error(err.message);
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const updatePhoto = (i, value) => {
    const next = [...form.photos];
    next[i] = value;
    setForm({ ...form, photos: next });
  };

  if (!venues) return <LoadingSpinner full />;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={() => setConfirm(c => ({ ...c, isOpen: false }))}
        onConfirm={confirm.action}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
      />
      <Link to="/organizer" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/60 hover:text-ink">
        <ArrowLeft size={15} /> {t('venueManager.backToDashboard')}
      </Link>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{t('venueManager.title')}</h1>
          <p className="mt-1 text-ink/60">{t('venueManager.subtitle')}</p>
        </div>
        <button onClick={showForm ? closeForm : openAddForm} className="btn-primary">
          {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? t('venueManager.cancel') : t('venueManager.addVenue')}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="card mt-6 space-y-4 p-6"
          >
            <h2 className="font-display text-lg font-semibold text-ink">{editingId ? t('venueManager.editVenue') : t('venueManager.newVenue')}</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">{t('venueManager.venueName')}</label>
                <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('venueManager.city')}</label>
                <input required className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="label">{t('venueManager.address')}</label>
              <input required className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">{t('venueManager.capacity')}</label>
                <input
                  type="number"
                  required
                  min={1}
                  className="input"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t('venueManager.amenities')}</label>
                <input
                  className="input"
                  placeholder={t('venueManager.amenitiesPlaceholder')}
                  value={form.amenities}
                  onChange={(e) => setForm({ ...form, amenities: e.target.value })}
                />
              </div>
            </div>

            {/* Photos — same "paste a direct image URL" pattern used for event banners
                elsewhere in the app (no file upload backend exists), but repeatable
                since a venue benefits from showing more than one angle. */}
            <div>
              <label className="label">{t('venueManager.photos')}</label>
              <div className="space-y-2">
                {form.photos.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="input flex-1"
                      placeholder={t('venueManager.photoUrlPlaceholder')}
                      value={url}
                      onChange={(e) => updatePhoto(i, e.target.value)}
                    />
                    {url && (
                      <img
                        src={url}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg object-cover"
                        onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, photos: form.photos.filter((_, j) => j !== i) })}
                      className="shrink-0 rounded-xl border border-ink/10 p-2.5 text-ink/40 hover:text-red-500"
                      aria-label={t('venueManager.removePhoto')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, photos: [...form.photos, ''] })}
                  className="btn-secondary !py-2 text-xs"
                >
                  <ImagePlus size={13} /> {t('venueManager.addPhotoUrl')}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? t('venueManager.saving') : editingId ? t('venueManager.saveChanges') : t('venueManager.addVenue')}
              </button>
              <button type="button" onClick={closeForm} className="btn-secondary">
                {t('venueManager.cancel')}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {venues.length === 0 ? (
          <p className="text-sm text-ink/50 sm:col-span-2">{t('venueManager.noVenuesYet')}</p>
        ) : (
          venues.map((v) => (
            <TiltCard key={v._id} intensity={6} className="card overflow-hidden !p-0">
              {v.photos?.length > 0 && (
                <div className="flex h-36 gap-0.5 overflow-hidden">
                  {v.photos.slice(0, 3).map((url, i) => (
                    <img key={i} src={url} alt="" className="h-full flex-1 object-cover" />
                  ))}
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display font-semibold text-ink">{v.name}</p>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openEditForm(v)}
                      className="rounded-lg p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink"
                      aria-label={t('venueManager.editVenueLabel')}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      disabled={deletingId === v._id}
                      className="rounded-lg p-1.5 text-ink/40 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                      aria-label={t('venueManager.deleteVenueLabel')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/60">
                  <MapPin size={14} /> {v.address}, {v.city}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/60">
                  <Users size={14} /> {t('venueManager.capacityLabel', { capacity: v.capacity.toLocaleString() })}
                </p>
                {v.amenities?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {v.amenities.map((a) => (
                      <span key={a} className="pill bg-ink/5 text-ink/60">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </TiltCard>
          ))
        )}
      </div>
    </div>
  );
}
