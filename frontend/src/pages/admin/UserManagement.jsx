import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Search, ShieldCheck, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const roles = ['all', 'admin', 'organizer', 'vendor', 'attendee'];
const PAGE_SIZE = 20;

export default function UserManagement() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const fetchPage = (targetPage, append) => {
    const params = new URLSearchParams({ limit: PAGE_SIZE, page: targetPage });
    if (q) params.set('q', q);
    if (role !== 'all') params.set('role', role);
    return api.get(`/users?${params.toString()}`).then(({ data }) => {
      setUsers((prev) => (append ? [...(prev || []), ...data.users] : data.users));
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchPage(1, false), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role]);

  const loadMore = () => {
    setLoadingMore(true);
    fetchPage(page + 1, true).finally(() => setLoadingMore(false));
  };

  const toggleActive = async (u) => {
    setTogglingId(u.id);
    try {
      await api.patch(`/users/${u.id}/status`, { isActive: !u.isActive });
      toast.success(t(u.isActive ? 'userManagement.deactivatedToast' : 'userManagement.reactivatedToast', { name: u.name }));
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: !x.isActive } : x)));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/60 hover:text-ink">
        <ArrowLeft size={15} /> {t('userManagement.backToDashboard')}
      </Link>

      <h1 className="mt-4 font-display text-3xl font-semibold text-ink">{t('userManagement.title')}</h1>
      <p className="mt-1 text-ink/60">{total > 0 ? t('userManagement.accounts', { count: total }) : t('userManagement.searchSubtitle')}</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
          <input className="input pl-11" placeholder={t('userManagement.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input sm:w-48" value={role} onChange={(e) => setRole(e.target.value)}>
          {roles.map((r) => (
            <option key={r} value={r}>{r === 'all' ? t('userManagement.allRoles') : t(`roles.${r}`)}</option>
          ))}
        </select>
      </div>

      {!users ? (
        <LoadingSpinner />
      ) : users.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-ink/60">{t('userManagement.noMatch')}</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 overflow-hidden rounded-xl2 border border-ink/8 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink/[0.03] text-ink/50">
              <tr>
                <th className="px-5 py-3 font-medium">{t('userManagement.colName')}</th>
                <th className="px-5 py-3 font-medium">{t('userManagement.colRole')}</th>
                <th className="px-5 py-3 font-medium">{t('userManagement.colStatus')}</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-ink/6">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{u.name}</p>
                    <p className="text-xs text-ink/50">{u.email}</p>
                  </td>
                  <td className="px-5 py-3 capitalize text-ink/70">{t(`roles.${u.role}`)}</td>
                  <td className="px-5 py-3">
                    <span className={`pill ${u.isActive ? 'bg-vibe-gradient-soft text-magenta' : 'bg-red-100 text-red-600'}`}>
                      {u.isActive ? t('userManagement.active') : t('userManagement.deactivated')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.id === me?.id ? (
                      <span className="text-xs text-ink/30">{t('userManagement.you')}</span>
                    ) : (
                      <button
                        onClick={() => toggleActive(u)}
                        disabled={togglingId === u.id}
                        className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline ${
                          u.isActive ? 'text-red-500' : 'text-magenta'
                        }`}
                      >
                        {u.isActive ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                        {togglingId === u.id ? t('userManagement.updating') : u.isActive ? t('userManagement.deactivate') : t('userManagement.reactivate')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {users && page < pages && (
        <div className="mt-4 flex justify-center">
          <button onClick={loadMore} disabled={loadingMore} className="btn-secondary">
            {loadingMore ? t('userManagement.loading') : t('userManagement.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
