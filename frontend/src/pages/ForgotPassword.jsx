import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, KeyRound, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import Logo from '../components/Logo';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState('request'); // 'request' | 'reset' | 'done'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const requestOtp = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success(t('forgotPassword.otpSent'));
      setStep('reset');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      setStep('done');
      toast.success(t('forgotPassword.passwordReset'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-16">
      <Logo className="mb-8" />

      <AnimatePresence mode="wait">
        {step === 'request' && (
          <motion.div key="request" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <h1 className="font-display text-2xl font-semibold text-ink">{t('forgotPassword.requestTitle')}</h1>
            <p className="mt-1 text-sm text-ink/60">{t('forgotPassword.requestBody')}</p>
            <form onSubmit={requestOtp} className="mt-8 space-y-4">
              <div>
                <label className="label">{t('forgotPassword.email')}</label>
                <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('forgotPassword.emailPlaceholder')} />
              </div>
              <button type="submit" disabled={busy} className="btn-primary w-full">
                <Mail size={16} /> {busy ? t('forgotPassword.sending') : t('forgotPassword.sendCode')}
              </button>
            </form>
          </motion.div>
        )}

        {step === 'reset' && (
          <motion.div key="reset" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <h1 className="font-display text-2xl font-semibold text-ink">{t('forgotPassword.resetTitle')}</h1>
            <p className="mt-1 text-sm text-ink/60">{t('forgotPassword.resetBody', { email })}</p>
            <form onSubmit={resetPassword} className="mt-8 space-y-4">
              <div>
                <label className="label">{t('forgotPassword.codeLabel')}</label>
                <input
                  required
                  maxLength={6}
                  inputMode="numeric"
                  className="input tracking-[0.5em]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                />
              </div>
              <div>
                <label className="label">{t('forgotPassword.newPassword')}</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('forgotPassword.newPasswordPlaceholder')}
                />
              </div>
              <button type="submit" disabled={busy} className="btn-primary w-full">
                <KeyRound size={16} /> {busy ? t('forgotPassword.resetting') : t('forgotPassword.resetPassword')}
              </button>
              <button type="button" onClick={() => setStep('request')} className="w-full text-center text-xs text-ink/50 hover:text-ink">
                {t('forgotPassword.tryDifferentEmail')}
              </button>
            </form>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 12 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-vibe-gradient-soft text-magenta"
            >
              <CheckCircle2 size={32} />
            </motion.div>
            <h1 className="mt-5 font-display text-xl font-semibold text-ink">{t('forgotPassword.doneTitle')}</h1>
            <p className="mt-1 text-sm text-ink/60">{t('forgotPassword.doneBody')}</p>
            <button onClick={() => navigate('/login')} className="btn-primary mt-6 w-full">
              {t('forgotPassword.goToLogin')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {step !== 'done' && (
        <p className="mt-6 text-center text-sm text-ink/60">
          {t('forgotPassword.rememberedIt')} <Link to="/login" className="font-semibold text-magenta hover:underline">{t('forgotPassword.logIn')}</Link>
        </p>
      )}
    </div>
  );
}
