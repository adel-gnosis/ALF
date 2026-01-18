import api from './api';
import { LoginResponse, User } from '../types/console';

export const authApi = {
    login: async (credentials: any): Promise<LoginResponse> => {
        const response = await api.post('/auth/login/', credentials);
        return response.data;
    },

    refresh: async (refresh: string): Promise<{ access: string }> => {
        const response = await api.post('/auth/refresh/', { refresh });
        return response.data;
    },

    me: async (): Promise<User> => {
        const response = await api.get('/auth/me/');
        return response.data;
    }
};
