import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n';

export default function LanguageSwitcher({ compact = false }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click — standard dropdown behavior, but easy to forget and leaves
  // the menu stuck open until the user clicks the trigger again otherwise.
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full p-2 text-ink/70 transition hover:bg-ink/5 hover:text-ink ${compact ? '' : ''}`}
        aria-label={t('language.label')}
      >
        <Globe size={compact ? 18 : 20} />
        {!compact && <span className="text-sm font-medium">{current.code.toUpperCase()}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-40 overflow-hidden rounded-xl2 border border-ink/8 bg-white py-1 shadow-card">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                i18n.changeLanguage(lang.code);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink/80 transition hover:bg-ink/5"
            >
              {lang.label}
              {lang.code === current.code && <Check size={14} className="text-magenta" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
