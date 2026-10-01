import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';

export default function Footer() {
  const { t } = useTranslation();
  const links = [
    { to: '/events', label: t('nav.exploreEvents') },
    { to: '/gallery', label: t('nav.gallery') },
    { to: '/about', label: t('footer.aboutUs') },
    { to: '/contact', label: t('footer.contactUs') },
  ];

  return (
    <footer className="border-t border-ink/8 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <Logo size={28} />
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="text-sm text-ink/60 transition hover:text-magenta">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-8 text-xs text-ink/40">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
