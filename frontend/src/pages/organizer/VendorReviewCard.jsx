import { useState } from 'react';
import toast from 'react-hot-toast';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import StarRating from '../../components/StarRating';

/**
 * One row per vendor booked on this event. Submits straight to
 * POST /api/vendors/:id/reviews — the backend enforces that the event is actually
 * completed and that this vendor was really assigned to it, so this component only
 * needs to worry about collecting the rating/comment and reflecting the result.
 */
function VendorRow({ vendor, eventId }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!rating) return toast.error(t('vendorReview.pickRating'));
    setBusy(true);
    try {
      await api.post(`/vendors/${vendor._id}/reviews`, { eventId, rating, comment });
      setSubmitted(true);
      toast.success(t('vendorReview.thanksRating', { name: vendor.name }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-ink/8 bg-ink/[0.02] p-3 text-sm text-ink/50">
        <span>{vendor.name}</span>
        <span className="flex items-center gap-1">
          <Star size={13} className="fill-magenta text-magenta" /> {t('vendorReview.reviewed')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-ink/10 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">{vendor.name}</p>
        <StarRating value={rating} onChange={setRating} size={17} />
      </div>
      <input
        className="input !py-1.5 text-xs"
        placeholder={t('vendorReview.commentPlaceholder')}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button onClick={submit} disabled={busy} className="btn-secondary !py-1.5 text-xs">
        {busy ? t('vendorReview.saving') : t('vendorReview.submitReview')}
      </button>
    </div>
  );
}

export default function VendorReviewCard({ event }) {
  const { t } = useTranslation();
  if (event.status !== 'completed' || !event.vendors?.length) return null;

  return (
    <div className="card mt-6 space-y-3 p-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">{t('vendorReview.rateHeading')}</h2>
        <p className="mt-1 text-sm text-ink/60">
          {t('vendorReview.rateBody')}
        </p>
      </div>
      <div className="space-y-2">
        {event.vendors.map((v) => (
          <VendorRow key={v._id} vendor={v} eventId={event._id} />
        ))}
      </div>
    </div>
  );
}
