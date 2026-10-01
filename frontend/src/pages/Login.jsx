import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import GoogleButton from '../components/GoogleButton';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(t('auth.welcomeBack', { name: user.name.split(' ')[0] }));
      const from = location.state?.from?.pathname;
      const fallback = { admin: '/admin', organizer: '/organizer', vendor: '/vendor' }[user.role] || '/events';
      navigate(from || fallback, { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Logo className="mb-8" />
        <h1 className="font-display text-2xl font-semibold text-ink">{t('auth.loginTitle')}</h1>
        <p className="mt-1 text-sm text-ink/60">{t('auth.loginSubtitle')}</p>

        <div className="mt-6">
          <GoogleButton label={t('auth.loginWithGoogle')} />
        </div>
        <div className="my-6 flex items-center gap-3 text-xs text-ink/40">
          <div className="h-px flex-1 bg-ink/10" />
          {t('auth.orUseEmail')}
          <div className="h-px flex-1 bg-ink/10" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">{t('auth.email')}</label>
            <input
              type="email"
              required
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="label">{t('auth.password')}</label>
              <Link to="/forgot-password" className="mb-1.5 text-xs font-medium text-magenta hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <input
              type="password"
              required
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? t('auth.loggingIn') : t('auth.logIn')}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink/60">
          {t('auth.newHere')}{' '}
          <Link to="/register" className="font-semibold text-magenta hover:underline">
            {t('auth.createAccount')}
          </Link>
        </p>

        <div className="mt-8 rounded-xl2 border border-ink/8 bg-white p-4 text-xs text-ink/50">
          <p className="font-semibold text-ink/70">{t('auth.demoLoginsTitle')}</p>
          <p className="mt-1">admin@vibecrafters.com / Admin@123</p>
          <p>organizer@vibecrafters.com / Organizer@123</p>
          <p>vendor@vibecrafters.com / Vendor@123</p>
          <p>attendee@vibecrafters.com / Attendee@123</p>
        </div>
      </motion.div>
    </div>
  );
}
