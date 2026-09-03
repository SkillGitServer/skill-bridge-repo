import axios from 'axios';

/**
 * Dynamic API Base URL resolver.
 * Sanitizes trailing slashes to prevent double-slash (//api) routing errors.
 */
const rawBaseUrl =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : '');

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

// Automatically set Axios default base URL globally
axios.defaults.baseURL = API_BASE_URL;

export default API_BASE_URL;
