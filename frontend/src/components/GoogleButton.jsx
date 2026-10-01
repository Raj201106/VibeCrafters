export default function GoogleButton({ label = 'Continue with Google' }) {
  const handleClick = () => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    window.location.href = `${apiBase}/auth/google`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-ink/15 bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink/30 hover:bg-ink/[0.02]"
    >
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.9 29.6 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.8 14.1-5l-6.5-5.5C29.5 35.1 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5c3.3 6.6 10.1 11 17.8 11z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.5 5.5C41.4 36 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z"/>
      </svg>
      {label}
    </button>
  );
}
