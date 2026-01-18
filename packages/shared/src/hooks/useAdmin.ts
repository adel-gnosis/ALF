import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/admin';

export const usePendingReviews = () => {
    return useQuery({
        queryKey: ['admin-reviews-pending'],
        queryFn: adminApi.getPendingReview
    });
};

export const useAdminActivities = (params?: { 
    status?: string; 
    activity_type?: string; 
    created_by_me?: boolean;
}) => {
    return useQuery({
        queryKey: ['admin-activities', params],
        queryFn: () => adminApi.getAllActivities(params)
    });
};

export const useApproveActivity = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminApi.approveActivity,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reviews-pending'] });
            queryClient.invalidateQueries({ queryKey: ['admin-activities'] });
        }
    });
};

export const useRejectActivity = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) => adminApi.rejectActivity(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reviews-pending'] });
            queryClient.invalidateQueries({ queryKey: ['admin-activities'] });
        }
    });
};

export const useAdminTeachers = () => {
    return useQuery({
        queryKey: ['admin-teachers'],
        queryFn: adminApi.getTeachers
    });
};

export const useSetPermissionLevel = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, level }: { id: number; level: string }) => adminApi.setPermissionLevel(id, level),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
        }
    });
};