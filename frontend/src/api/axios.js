import axios from 'axios';

// In local dev, Vite proxies "/api" to the backend (see vite.config.js). In production
// (e.g. Vercel), set VITE_API_URL to your deployed backend's full URL.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message || 'Something went wrong. Please try again.';
    return Promise.reject({ ...err, message });
  }
);

export default api;
