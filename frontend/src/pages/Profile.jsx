import { useState } from 'react';
import { motion } from 'motion/react';
import { User, KeyRound, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', avatarUrl: user?.avatarUrl || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [fileName, setFileName] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/profile', form);
      setUser(data.user);
      toast.success(t('profile.profileUpdated'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setSavingPw(true);
    try {
      await api.put('/auth/change-password', pw);
      toast.success(t('profile.passwordUpdated'));
      setPw({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPw(false);
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
          setForm((f) => ({ ...f, avatarUrl: res.data.url }));
          return 'Image uploaded successfully!';
        },
        error: 'Failed to upload image'
      }
    );
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-3xl font-semibold text-ink">{t('profile.title')}</h1>
        <p className="mt-1 text-ink/60">{t('profile.subtitle')}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mt-8 flex items-center gap-4"
      >
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-vibe-gradient text-xl font-bold text-white">
          {form.avatarUrl ? (
            <img src={form.avatarUrl} alt={user.name} className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
          ) : (
            user.name?.[0]?.toUpperCase()
          )}
        </div>
        <div>
          <p className="font-display text-lg font-semibold text-ink">{user.name}</p>
          <p className="text-sm capitalize text-ink/50">{t(`roles.${user.role}`)} · {user.email}</p>
        </div>
      </motion.div>

      <motion.form
        onSubmit={saveProfile}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="card mt-8 space-y-4 p-6"
      >
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <User size={18} className="text-magenta" /> {t('profile.profileDetails')}
        </h2>
        <div>
          <label className="label">{t('profile.fullName')}</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">{t('profile.phone')}</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 90000 00000" />
        </div>
        <div>
          <label className="label">Avatar Image</label>
          <div className="mt-1 flex items-center gap-4">
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <label htmlFor="avatar-upload" className="btn-secondary cursor-pointer">
              Choose File
            </label>
            {fileName ? (
              <span className="text-sm font-medium text-magenta truncate max-w-[200px]">{fileName}</span>
            ) : (
              <p className="text-xs text-ink/50">Upload a square image for best results.</p>
            )}
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={savingProfile} className="btn-primary">
          <Save size={16} /> {savingProfile ? t('profile.saving') : t('profile.saveProfile')}
        </motion.button>
      </motion.form>

      {!user.authProvider || user.authProvider === 'local' ? (
        <motion.form
          onSubmit={savePassword}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="card mt-6 space-y-4 p-6"
        >
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <KeyRound size={18} className="text-magenta" /> {t('profile.changePassword')}
          </h2>
          <div>
            <label className="label">{t('profile.currentPassword')}</label>
            <input type="password" required className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('profile.newPassword')}</label>
            <input type="password" required minLength={8} className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} placeholder={t('profile.newPasswordPlaceholder')} />
          </div>
          <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={savingPw} className="btn-secondary">
            {savingPw ? t('profile.updating') : t('profile.updatePassword')}
          </motion.button>
        </motion.form>
      ) : (
        <div className="card mt-6 p-6 text-sm text-ink/50">
          {t('profile.googleNoPassword')}
        </div>
      )}
    </div>
  );
}
