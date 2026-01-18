import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../services/auth';
import { setTokenProvider } from '../services/api';

// Simple token storage helper
const TOKEN_KEY = 'alf_access_token';
const REFRESH_KEY = 'alf_refresh_token';

// Helper to init the global axios interceptor
export const initAuthCallback = () => {
    setTokenProvider(async () => localStorage.getItem(TOKEN_KEY));
};

export const useLogin = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: authApi.login,
        onSuccess: (data) => {
            localStorage.setItem(TOKEN_KEY, data.access);
            localStorage.setItem(REFRESH_KEY, data.refresh);
            queryClient.setQueryData(['me'], data.user);
        }
    });
};

export const useMe = () => {
    return useQuery({
        queryKey: ['me'],
        queryFn: authApi.me,
        retry: false, // Don't retry if 401
        staleTime: 1000 * 60 * 5, // 5 mins
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();
    return () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        queryClient.removeQueries({ queryKey: ['me'] });
        window.location.href = '/auth/login';
    };
};
