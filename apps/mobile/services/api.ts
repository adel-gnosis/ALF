import axios from 'axios';
import storage from './storage';

import { Platform } from 'react-native';

// Use different API_URL for Web and Mobile
// const isWeb = typeof window !== "undefined"; 
const isWeb = Platform.OS === 'web';

// Define API URL based on environment
export const API_URL = isWeb
    ? 'http://localhost:8000/api'  // Web
    : 'http://192.168.1.235:8000/api';  // Mobile

console.log(`[API] Configuration: OS=${Platform.OS}, URL=${API_URL}`);

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    // Debug log
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} (Full: ${config.baseURL}${config.url})`);

    // specific endpoints that don't need auth
    if (config.url?.includes('/auth/login') || config.url?.includes('/auth/register')) {
        return config;
    }

    const token = await storage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
});

export default api;
