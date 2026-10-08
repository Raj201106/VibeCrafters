import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Store, CheckCircle2, Clock, Pencil, X, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import StarRating from '../../components/StarRating';
import { useAuth } from '../../context/AuthContext';

const serviceTypes = ['catering', 'decor', 'av_production', 'photography', 'security', 'entertainment', 'other'];
const emptyForm = { name: '', serviceType: 'catering', contactEmail: '', contactPhone: '', pricingNotes: '' };

export default function VendorDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [vendors, setVendors] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [expandedReviewsId, setExpandedReviewsId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const toggleReviews = async (vendorId) => {
    if (expandedReviewsId === vendorId) {
      setExpandedReviewsId(null);
      return;
    }
    setExpandedReviewsId(vendorId);
    setLoadingReviews(true);
    try {
      const { data } = await api.get(`/vendors/${vendorId}/reviews`);
      setReviews(data.reviews);
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const load = () => api.get('/vendors').then(({ data }) => setVendors(data.vendors));
  useEffect(() => { load(); }, []);

  const startEdit = (v) => {
    setEditingId(v._id);
    setForm({
      name: v.name,
      serviceType: v.serviceType,
      contactEmail: v.contactEmail,
      contactPhone: v.contactPhone,
      pricingNotes: v.pricingNotes || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editingId) {
        await api.put(`/vendors/${editingId}`, form);
        toast.success(t('vendorDashboard.listingUpdated'));
      } else {
        await api.post('/vendors', form);
        toast.success(t('vendorDashboard.submittedToast'));
      }
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!vendors || !user) return <LoadingSpinner full />;

  const myListings = vendors.filter((v) => v.user === user.id || v.user?._id === user.id);
  const otherVendors = vendors.filter((v) => v.user !== user.id && v.user?._id !== user.id);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink">{t('vendorDashboard.title')}</h1>
      <p className="mt-1 text-ink/60">{t('vendorDashboard.subtitle')}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {(!myListings.length || editingId) && (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card space-y-4 p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <Store size={18} className="text-magenta" /> {editingId ? t('vendorDashboard.editListing') : t('vendorDashboard.addProfile')}
              </h2>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="text-xs font-medium text-ink/50 hover:text-ink">
                  <X size={14} className="inline" /> {t('vendorDashboard.cancel')}
                </button>
              )}
            </div>
            <div>
              <label className="label">{t('vendorDashboard.businessName')}</label>
              <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('vendorDashboard.serviceType')}</label>
              <select className="input" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
                {serviceTypes.map((s) => <option key={s} value={s}>{t(`serviceTypes.${s}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t('vendorDashboard.contactEmail')}</label>
              <input type="email" required className="input" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('vendorDashboard.contactPhone')}</label>
              <input required className="input" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('vendorDashboard.pricingNotes')}</label>
              <textarea className="input min-h-20" value={form.pricingNotes} onChange={(e) => setForm({ ...form, pricingNotes: e.target.value })} />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? t('vendorDashboard.saving') : editingId ? t('vendorDashboard.saveChanges') : t('vendorDashboard.submitForApproval')}
            </button>
          </motion.form>
        )}

        <div className="space-y-8">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">{t('vendorDashboard.myListings')}</h2>
            <div className="mt-4 space-y-3">
              {myListings.length === 0 ? (
                <p className="text-sm text-ink/50">{t('vendorDashboard.noListings')}</p>
              ) : (
                myListings.map((v) => (
                  <div key={v._id} className="card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-ink">{v.name}</p>
                        <p className="text-xs capitalize text-ink/50">{t(`serviceTypes.${v.serviceType}`)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {v.rating > 0 && <StarRating value={v.rating} readOnly size={13} />}
                        {v.approved ? (
                          <span className="pill flex items-center gap-1 bg-vibe-gradient-soft text-magenta">
                            <CheckCircle2 size={12} /> {t('vendorDashboard.approved')}
                          </span>
                        ) : (
                          <span className="pill flex items-center gap-1 bg-ink/10 text-ink/50">
                            <Clock size={12} /> {t('vendorDashboard.pending')}
                          </span>
                        )}
                        <button onClick={() => toggleReviews(v._id)} className="rounded-full p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink" aria-label={t('vendorDashboard.viewReviews')}>
                          <MessageSquare size={14} />
                        </button>
                        <button onClick={() => startEdit(v)} className="rounded-full p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink" aria-label={t('vendorDashboard.editListingLabel')}>
                          <Pencil size={14} />
                        </button>
                      </div>
                    </div>

                    {expandedReviewsId === v._id && (
                      <div className="mt-3 space-y-2 border-t border-ink/8 pt-3">
                        {loadingReviews ? (
                          <p className="text-xs text-ink/40">{t('vendorDashboard.loadingReviews')}</p>
                        ) : reviews.length === 0 ? (
                          <p className="text-xs text-ink/40">{t('vendorDashboard.noReviews')}</p>
                        ) : (
                          reviews.map((r) => (
                            <div key={r._id} className="rounded-lg bg-ink/[0.03] p-2.5 text-sm">
                              <div className="flex items-center justify-between">
                                <StarRating value={r.rating} readOnly size={12} />
                                <span className="text-xs text-ink/40">{r.event?.title}</span>
                              </div>
                              {r.comment && <p className="mt-1 text-ink/70">{r.comment}</p>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-ink">{t('vendorDashboard.otherVendors')}</h2>
            <div className="mt-4 space-y-3">
              {otherVendors.length === 0 ? (
                <p className="text-sm text-ink/50">{t('vendorDashboard.noOtherVendors')}</p>
              ) : (
                otherVendors.map((v) => (
                  <div key={v._id} className="card flex items-center justify-between p-4">
                    <div>
                      <p className="font-semibold text-ink">{v.name}</p>
                      <p className="text-xs capitalize text-ink/50">{t(`serviceTypes.${v.serviceType}`)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {v.rating > 0 && <StarRating value={v.rating} readOnly size={13} />}
                      <span className="pill flex items-center gap-1 bg-vibe-gradient-soft text-magenta">
                        <CheckCircle2 size={12} /> {t('vendorDashboard.approved')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
