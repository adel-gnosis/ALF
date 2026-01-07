import axios from 'axios';
import storage from './storage';
import { Platform } from 'react-native';

// Expo: EXPO_PUBLIC_* works for native + web
const ENV_API =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL;

// Smart defaults:
// - Web on your PC should use localhost
// - Native phone should use LAN IP (you can change it in .env.local)
// - Fallback stays localhost
const DEFAULT_WEB = 'http://127.0.0.1:8000/api';
const DEFAULT_NATIVE = 'http://192.168.1.235:8000/api';

export const API_URL =
  ENV_API ||
  (Platform.OS === 'web' ? DEFAULT_WEB : DEFAULT_NATIVE);

console.log(`[API] Configuration: OS=${Platform.OS}, URL=${API_URL}`);

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config) => {
    console.log(
      `[API Request] ${config.method?.toUpperCase()} ${config.url} (Full: ${config.baseURL}${config.url})`
    );

    // endpoints that don't need auth
    if (config.url?.includes('/auth/login') || config.url?.includes('/auth/register')) {
      return config;
    }

    const token = await storage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

export default api;
