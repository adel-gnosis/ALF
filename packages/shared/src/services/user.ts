import api from './api';

export interface User {
    id: string;
    username: string;
    email: string;
    native_language: 'fr' | 'en' | 'ar';
    role: string;
    first_name?: string;
    last_name?: string;
}

export const userApi = {
    /**
     * Select user's preferred UI language
     */
    selectLanguage: async (language: 'fr' | 'en' | 'ar'): Promise<{ message: string; language: string }> => {
        const response = await api.post('/users/select-language/', { language });
        return response.data;
    },

    /**
     * Get current user profile
     */
    getCurrentUser: async (): Promise<User> => {
        const response = await api.get('/users/me/');
        return response.data;
    },
};
