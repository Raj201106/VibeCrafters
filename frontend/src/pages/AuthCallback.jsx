import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { getSocket } from '../api/socket';

export default function AuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        getSocket().connect();
        toast.success(t('authCallback.signedInAs', { name: data.user.name.split(' ')[0] }));
        const fallback = { admin: '/admin', organizer: '/organizer', vendor: '/vendor' }[data.user.role] || '/events';
        navigate(fallback, { replace: true });
      })
      .catch(() => {
        toast.error(t('authCallback.googleFailed'));
        navigate('/login', { replace: true });
      });
  }, [navigate, setUser, t]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-cream">
      <LoadingSpinner />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-sm text-ink/50"
      >
        {t('authCallback.finishing')}
      </motion.p>
    </div>
  );
}
