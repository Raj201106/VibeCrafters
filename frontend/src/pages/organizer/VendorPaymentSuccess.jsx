import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function VendorPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [error, setError] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const bookingId = searchParams.get('booking_id');

    if (!sessionId || !bookingId) {
      setStatus('error');
      setError('Invalid payment verification link.');
      return;
    }

    api.get(`/vendors/gigs/${bookingId}/verify-payment?session_id=${sessionId}`)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setError(err.message || 'Payment verification failed. Please contact support.');
      });
  }, [searchParams]);

  if (status === 'verifying') return <LoadingSpinner full text="Verifying payment..." />;

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card max-w-md p-8 text-center"
      >
        {status === 'success' ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">Payment Successful!</h1>
            <p className="mt-2 text-ink/60">
              The vendor has been successfully booked for your event. They have been added to your event's public page!
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Link to="/organizer" className="btn-primary">
                Return to Dashboard
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertCircle size={32} />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">Payment Failed</h1>
            <p className="mt-2 text-ink/60">{error}</p>
            <div className="mt-8 flex flex-col gap-3">
              <Link to="/organizer" className="btn-primary">
                Return to Dashboard
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
