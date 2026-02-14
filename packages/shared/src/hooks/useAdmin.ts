import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/admin';
import { DashboardStats } from '../types/console';

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
    course_id?: string;
    subject_id?: string;
    level_id?: string;
    difficulty?: string;
    search?: string;
    page?: number;
    page_size?: number;
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

// NEW: Hook for fetching version diff
export const useVersionDiff = (activityId: number | null) => {
    return useQuery({
        queryKey: ['version-diff', activityId],
        queryFn: () => activityId ? adminApi.getVersionDiff(activityId) : null,
        enabled: activityId !== null
    });
};

export const useAdminTeachers = (params?: {
    search?: string;
    user_type?: string;
    permission_level?: string;
    has_activities?: boolean;
    ordering?: string;
}) => {
    return useQuery({
        queryKey: ['admin-teachers', params],
        queryFn: () => adminApi.getTeachers(params)
    });
};

export const useDashboardStats = () => {
    return useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: () => adminApi.getDashboardStats()
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