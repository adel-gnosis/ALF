import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../services/user';

/**
 * Hook to select user's UI language
 */
export function useSelectLanguage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: userApi.selectLanguage,
        onSuccess: () => {
            // Invalidate user query to refetch with new language
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });
}

/**
 * Hook to get current user
 */
export function useCurrentUser() {
    return useQuery({
        queryKey: ['user'],
        queryFn: userApi.getCurrentUser,
    });
}
