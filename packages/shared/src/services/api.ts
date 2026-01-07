import axios from 'axios';

// Base URL can be configured via env vars
// IMPORTANT:
// - Next.js exposes NEXT_PUBLIC_*
// - Expo exposes EXPO_PUBLIC_*
// - Fallback remains localhost for local dev
const envApiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL;

export const API_BASE_URL = envApiUrl || 'http://localhost:8000/api';


const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// function to update base URL at runtime (e.g. for mobile)
export const setApiBaseUrl = (url: string) => {
    api.defaults.baseURL = url;
};

let tokenProvider: (() => Promise<string | null>) | null = null;

export const setTokenProvider = (provider: () => Promise<string | null>) => {
    tokenProvider = provider;
};

// Add interceptors for auth
api.interceptors.request.use(async (config) => {
    if (tokenProvider) {
        const token = await tokenProvider();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export default api;
