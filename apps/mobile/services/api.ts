import axios from 'axios';
import storage from './storage';
import { Platform } from 'react-native';

// Expo: EXPO_PUBLIC_* works for native + web
const ENV_API =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL;

// We strictly use the environment variable for production/standalone builds.
// Hardcoded LAN IPs cause "Network Error" when the server is not reachable.
// If ENV_API is missing (common in direct gradlew builds), we fallback to the production URL in non-dev mode.
export const API_URL = ENV_API || (__DEV__ ? 'http://localhost:8000/api' : 'https://api.eduvia.ma/api');

console.log(`[API] Configuration: OS=${Platform.OS}, URL=${API_URL}, ENV_SET=${!!ENV_API}, DEV=${__DEV__}`);

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

export const resolveMediaUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;

  // Remove /api suffix if present to get base host
  const baseUrl = API_URL.replace(/\/api\/?$/, '');

  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${cleanPath}`;
};

export default api;
