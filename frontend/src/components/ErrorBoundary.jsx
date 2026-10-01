import { Component } from 'react';
import { RefreshCw, Home } from 'lucide-react';
import i18n from '../i18n';

/**
 * Without an error boundary anywhere in the tree, a single thrown error during render
 * (a null property access, a bad third-party library call, etc.) unmounts the *entire*
 * React app — Navbar, Footer, everything — leaving a permanently blank white page until
 * the user manually hard-refreshes. This boundary catches those errors at the route
 * level (see App.jsx, where it's keyed by pathname) so a bug on one page shows a
 * friendly, recoverable screen instead of taking down the whole site.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Caught by ErrorBoundary:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <RefreshCw size={24} />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold text-ink">{i18n.t('errorBoundary.title')}</h1>
          <p className="mt-2 text-sm text-ink/60">
            {i18n.t('errorBoundary.body')}
          </p>
          <div className="mt-6 flex gap-3">
            <button onClick={() => window.location.reload()} className="btn-primary">
              <RefreshCw size={15} /> {i18n.t('errorBoundary.reload')}
            </button>
            <a href="/" className="btn-secondary">
              <Home size={15} /> {i18n.t('errorBoundary.goHome')}
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
