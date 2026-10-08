import { Link, NavLink } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, Ticket, LayoutDashboard, User as UserIcon, LogOut } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

const dashboardPathFor = (role) =>
  ({ admin: '/admin', organizer: '/organizer', vendor: '/vendor' }[role] || null);

const linkVariants = {
  hidden: { opacity: 0, x: 24 },
  show: (i) => ({ opacity: 1, x: 0, transition: { delay: 0.05 + i * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] } }),
};

export default function MobileMenu({ open, onClose, user, onLogout }) {
  const { t } = useTranslation();
  const navLinkClass = ({ isActive }) =>
    `block py-3 text-lg font-medium ${isActive ? 'text-magenta' : 'text-ink'}`;

  const dashboardLabelFor = (role) =>
    ({ admin: t('nav.adminConsole'), organizer: t('nav.organizerStudio'), vendor: t('nav.vendorHub') }[role] || null);

  const publicLinks = [];
  if (!user || user?.role === 'attendee') {
    publicLinks.push(
      { to: '/events', label: t('nav.exploreEvents') },
      { to: '/gallery', label: t('nav.gallery') },
      { to: '/about', label: t('nav.about') },
      { to: '/contact', label: t('nav.contact') }
    );
  } else if (user?.role === 'organizer' || user?.role === 'vendor') {
    publicLinks.push({ to: '/events', label: t('nav.exploreEvents') });
  }

  const dashboardPath = user ? dashboardPathFor(user.role) : null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-ink/40 backdrop-blur-sm md:hidden"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed right-0 top-0 z-[101] h-[100dvh] w-full max-w-sm overflow-y-auto bg-cream p-6 shadow-glow md:hidden"
          >
            <div className="flex items-center justify-between">
              <LanguageSwitcher align="left" />
              <button onClick={onClose} className="rounded-full p-2 text-ink/60 hover:bg-ink/5" aria-label="Close menu">
                <X size={22} />
              </button>
            </div>

            <nav className="mt-4">
              {publicLinks.map((l, i) => (
                <motion.div key={l.to} custom={i} variants={linkVariants} initial="hidden" animate="show">
                  <NavLink to={l.to} onClick={onClose} className={navLinkClass}>
                    {l.label}
                  </NavLink>
                </motion.div>
              ))}

              {user && dashboardPath && (
                <motion.div custom={publicLinks.length} variants={linkVariants} initial="hidden" animate="show">
                  <NavLink to={dashboardPath} onClick={onClose} className={navLinkClass}>
                    <span className="flex items-center gap-2">
                      <LayoutDashboard size={18} /> {dashboardLabelFor(user.role)}
                    </span>
                  </NavLink>
                </motion.div>
              )}

              {user?.role === 'attendee' && (
                <motion.div custom={publicLinks.length + 1} variants={linkVariants} initial="hidden" animate="show">
                  <NavLink to="/my-tickets" onClick={onClose} className={navLinkClass}>
                    <span className="flex items-center gap-2">
                      <Ticket size={18} /> {t('nav.myTickets')}
                    </span>
                  </NavLink>
                </motion.div>
              )}

              {user && (
                <motion.div custom={publicLinks.length + 2} variants={linkVariants} initial="hidden" animate="show">
                  <NavLink to="/profile" onClick={onClose} className={navLinkClass}>
                    <span className="flex items-center gap-2">
                      <UserIcon size={18} /> Account Settings
                    </span>
                  </NavLink>
                </motion.div>
              )}
            </nav>

            <div className="mt-8 border-t border-ink/10 pt-6">
              {user ? (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="flex items-center gap-2 text-lg font-medium text-ink/70"
                >
                  <LogOut size={18} /> {t('nav.logOut')}
                </motion.button>
              ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col gap-3">
                  <Link to="/login" onClick={onClose} className="btn-secondary w-full justify-center">
                    {t('nav.logIn')}
                  </Link>
                  <Link to="/register" onClick={onClose} className="btn-primary w-full justify-center">
                    {t('nav.getStarted')}
                  </Link>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
