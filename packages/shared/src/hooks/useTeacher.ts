import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teacherApi } from '../services/teacher';

export const useTeacherActivities = (params?: { status?: string, lesson_id?: number }) => {
    return useQuery({
        queryKey: ['teacher-activities', params],
        queryFn: () => teacherApi.getMyContent(params)
    });
};

export const useCreateActivity = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: teacherApi.createActivity,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher-activities'] });
            queryClient.invalidateQueries({ queryKey: ['teacher-stats'] });
        }
    });
};

export const useEditActivity = (id: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => teacherApi.editActivity(id, data),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ['teacher-activities'] });
            queryClient.invalidateQueries({ queryKey: ['activity', id] });
            // If version incremented, refetch detail
            if (updated.id !== id) {
                // This logic is tricky, UI should handle redirection or reload listing
            }
        }
    });
};

export const useSubmitForReview = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: teacherApi.submitForReview,
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['teacher-activities'] });
            queryClient.invalidateQueries({ queryKey: ['activity', id] });
            queryClient.invalidateQueries({ queryKey: ['teacher-activity', id] });
        }
    });
};

export const useActivityDetail = (id: number) => {
    return useQuery({
        queryKey: ['teacher-activity', id],
        queryFn: () => teacherApi.getActivityDetail(id),
        enabled: !!id
    });
};

export const useTeacherStats = () => {
    return useQuery({
        queryKey: ['teacher-stats'],
        queryFn: () => teacherApi.getStatsOverview()
    });
};

export const useBrowseActivities = (params?: {
    activity_type?: string;
    lesson_id?: number;
    subject_id?: number;
    level_id?: number;
    difficulty?: string;
    search?: string;
}) => {
    return useQuery({
        queryKey: ['browse-activities', params],
        queryFn: () => teacherApi.browseActivities(params)
    });
};
