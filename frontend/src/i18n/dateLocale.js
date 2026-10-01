import i18n from './index';

// Maps the active UI language to a BCP-47 locale so dates render with
// localized month/weekday names (e.g. Gujarati "સપ્ટે" instead of "Sep").
const LOCALES = { en: 'en-US', hi: 'hi-IN', gu: 'gu-IN' };

export const dateLocale = () => LOCALES[(i18n.language || 'en').split('-')[0]] || 'en-US';
