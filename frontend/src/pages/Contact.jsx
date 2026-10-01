import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

export default function Contact() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/contact', form);
      setSent(true);
      toast.success(t('contact.sentToast'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <span className="pill bg-vibe-gradient-soft text-magenta">{t('contact.tag')}</span>
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">{t('contact.title')}</h1>
        <p className="mt-2 max-w-xl text-ink/60">
          {t('contact.body')}
        </p>
      </motion.div>

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-4 lg:col-span-2"
        >
          {[
            { icon: Mail, label: t('contact.emailUs'), value: 'hello@vibecrafters.com' },
            { icon: Phone, label: t('contact.callUs'), value: '+91 90000 00000' },
            { icon: MapPin, label: t('contact.visitUs'), value: '221 Skyline Avenue, Ahmedabad' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="card flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-vibe-gradient-soft text-magenta">
                <Icon size={19} />
              </div>
              <div>
                <p className="text-xs text-ink/50">{label}</p>
                <p className="text-sm font-semibold text-ink">{value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="card p-6 lg:col-span-3"
        >
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-14 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-vibe-gradient-soft text-magenta"
                >
                  <CheckCircle2 size={26} />
                </motion.div>
                <p className="mt-4 font-display text-lg font-semibold text-ink">{t('contact.sentTitle')}</p>
                <p className="mt-1 text-sm text-ink/60">{t('contact.sentBody')}</p>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submit} exit={{ opacity: 0 }} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">{t('contact.name')}</label>
                    <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">{t('contact.email')}</label>
                    <input type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="label">{t('contact.subject')}</label>
                  <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder={t('contact.subjectPlaceholder')} />
                </div>
                <div>
                  <label className="label">{t('contact.message')}</label>
                  <textarea required className="input min-h-32" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>
                <button type="submit" disabled={busy} className="btn-primary w-full">
                  <Send size={16} /> {busy ? t('contact.sending') : t('contact.sendMessage')}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
