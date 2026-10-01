import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, useScroll, useMotionValueEvent } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, LayoutDashboard, Ticket, Menu } from 'lucide-react';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import MobileMenu from './MobileMenu';
import TiltCard from './TiltCard';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../context/AuthContext';

const dashboardPathFor = (role) =>
  ({ admin: '/admin', organizer: '/organizer', vendor: '/vendor' }[role] || '/my-tickets');

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 8));

  // Close the mobile menu automatically whenever the route changes (e.g. after tapping a link)
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${isActive ? 'text-magenta' : 'text-ink/70 hover:text-ink'}`;

  return (
    <motion.header
      animate={{
        boxShadow: scrolled ? '0 1px 0 rgba(15,42,61,0.08), 0 8px 24px rgba(15,42,61,0.05)' : '0 0 0 rgba(0,0,0,0)',
      }}
      transition={{ duration: 0.2 }}
      className="sticky top-0 z-30 border-b border-ink/8 bg-cream/90 backdrop-blur"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/">
          <TiltCard intensity={18} glare={false} className="inline-block">
            <Logo />
          </TiltCard>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <NavLink to="/events" className={linkClass}>
            {t('nav.exploreEvents')}
          </NavLink>
          <NavLink to="/gallery" className={linkClass}>
            {t('nav.gallery')}
          </NavLink>
          <NavLink to="/about" className={linkClass}>
            {t('nav.about')}
          </NavLink>
          <NavLink to="/contact" className={linkClass}>
            {t('nav.contact')}
          </NavLink>
          {user?.role === 'organizer' && (
            <NavLink to="/organizer" className={linkClass}>
              {t('nav.organizerStudio')}
            </NavLink>
          )}
          {user?.role === 'vendor' && (
            <NavLink to="/vendor" className={linkClass}>
              {t('nav.vendorHub')}
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={linkClass}>
              {t('nav.adminConsole')}
            </NavLink>
          )}
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher compact />
          {user ? (
            <>
              <NotificationBell />
              {user.role === 'attendee' && (
                <Link to="/my-tickets" className="rounded-full p-2 text-ink/70 transition hover:bg-ink/5 hover:text-ink" aria-label={t('nav.myTickets')}>
                  <Ticket size={20} />
                </Link>
              )}
              <Link
                to={dashboardPathFor(user.role)}
                className="hidden items-center gap-1.5 rounded-full p-2 text-ink/70 transition hover:bg-ink/5 hover:text-ink sm:flex"
                aria-label={t('nav.dashboard')}
              >
                <LayoutDashboard size={20} />
              </Link>
              <Link
                to="/profile"
                className="hidden items-center gap-2 rounded-full border border-ink/10 bg-white py-1 pl-1 pr-3 transition hover:border-ink/25 sm:flex"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-vibe-gradient text-xs font-bold text-white">
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium text-ink">{user.name?.split(' ')[0]}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="hidden rounded-full p-2 text-ink/70 transition hover:bg-ink/5 hover:text-ink md:flex"
                aria-label={t('nav.logOut')}
              >
                <LogOut size={19} />
              </button>
            </>
          ) : (
            <div className="hidden items-center gap-3 md:flex">
              <Link to="/login" className="text-sm font-medium text-ink/70 hover:text-ink">
                {t('nav.logIn')}
              </Link>
              <Link to="/register" className="btn-primary !px-5 !py-2 text-sm">
                {t('nav.getStarted')}
              </Link>
            </div>
          )}
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-full p-2 text-ink/70 transition hover:bg-ink/5 hover:text-ink md:hidden"
            aria-label={t('nav.openMenu')}
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} user={user} onLogout={handleLogout} />
    </motion.header>
  );
}
