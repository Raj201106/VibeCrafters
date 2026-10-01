import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import GoogleButton from '../components/GoogleButton';

export default function Register() {
  const { t } = useTranslation();
  const roles = [
    { value: 'attendee', label: t('auth.roleAttendee'), blurb: t('auth.roleAttendeeBlurb') },
    { value: 'organizer', label: t('auth.roleOrganizer'), blurb: t('auth.roleOrganizerBlurb') },
    { value: 'vendor', label: t('auth.roleVendor'), blurb: t('auth.roleVendorBlurb') },
  ];
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'attendee' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await register(form);
      toast.success(t('auth.welcomeNew', { name: user.name.split(' ')[0] }));
      const fallback = { organizer: '/organizer', vendor: '/vendor' }[user.role] || '/events';
      navigate(fallback, { replace: true });
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
        <h1 className="font-display text-2xl font-semibold text-ink">{t('auth.registerTitle')}</h1>
        <p className="mt-1 text-sm text-ink/60">{t('auth.registerSubtitle')}</p>

        <div className="mt-6">
          <GoogleButton label={t('auth.signupWithGoogle')} />
        </div>
        <div className="my-6 flex items-center gap-3 text-xs text-ink/40">
          <div className="h-px flex-1 bg-ink/10" />
          {t('auth.orUseEmail')}
          <div className="h-px flex-1 bg-ink/10" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {roles.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setForm({ ...form, role: r.value })}
              className={`rounded-xl2 border p-3 text-left transition ${
                form.role === r.value
                  ? 'border-magenta bg-vibe-gradient-soft'
                  : 'border-ink/10 bg-white hover:border-ink/25'
              }`}
            >
              <p className="text-sm font-semibold text-ink">{r.label}</p>
              <p className="mt-0.5 text-[11px] text-ink/50">{r.blurb}</p>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">{t('auth.fullName')}</label>
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jordan Rivera"
            />
          </div>
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
            <label className="label">{t('auth.password')}</label>
            <input
              type="password"
              required
              minLength={8}
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? t('auth.creatingAccount') : t('auth.createAccountButton')}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink/60">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link to="/login" className="font-semibold text-magenta hover:underline">
            {t('auth.logIn')}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
