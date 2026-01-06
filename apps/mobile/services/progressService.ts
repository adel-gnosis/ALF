import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './api';
import type {
    ProgressOverview,
    WeaknessAlert,
    FailedActivitiesResponse,
    WeaknessAnalysis,
} from '../types/progress';

// ============================================================================
// PROGRESS API CALLS
// ============================================================================

export const progressApi = {
    /**
     * Get overall progress
     */
    getProgress: async (courseId?: number): Promise<ProgressOverview> => {
        const params = courseId ? { course_id: courseId } : {};
        const response = await api.get('/progress/', { params });
        return response.data;
    },

    /**
     * Get weakness analysis for a level
     */
    getWeaknessAnalysis: async (levelId: number): Promise<WeaknessAnalysis> => {
        const response = await api.get('/progress/weakness-analysis/', {
            params: { level_id: levelId },
        });
        return response.data;
    },

    /**
     * Get active weakness alerts
     */
    getWeaknessAlerts: async (): Promise<WeaknessAlert[]> => {
        const response = await api.get('/progress/weakness-alerts/');
        return response.data;
    },

    /**
     * Get failed activities queue
     */
    getFailedActivities: async (levelId?: number): Promise<FailedActivitiesResponse> => {
        const params = levelId ? { level_id: levelId } : {};
        const response = await api.get('/progress/failed-activities/', { params });
        return response.data;
    },

    /**
     * Dismiss a weakness alert
     */
    dismissAlert: async (alertId: number): Promise<void> => {
        await api.post('/progress/dismiss-alert/', { alert_id: alertId });
    },

    /**
     * Start practice session with failed activities only
     */
    practiceFailed: async (levelId: number) => {
        const response = await api.post('/practice/failed-only/', { level_id: levelId });
        return response.data;
    },

    /**
     * Start subject-focused session
     */
    startSubjectSession: async (levelId: number, subjectId: number) => {
        const response = await api.post('/subject/start/', {
            level_id: levelId,
            subject_id: subjectId,
        });
        return response.data;
    },
};

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

/**
 * Hook to get overall progress
 */
export function useProgress(courseId?: number) {
    return useQuery({
        queryKey: ['progress', courseId],
        queryFn: () => progressApi.getProgress(courseId),
        enabled: !!courseId
    });
}

/**
 * Hook to get weakness analysis
 */
export function useWeaknessAnalysis(levelId: number, enabled = true) {
    return useQuery({
        queryKey: ['weakness-analysis', levelId],
        queryFn: () => progressApi.getWeaknessAnalysis(levelId),
        enabled: enabled && !!levelId,
    });
}

/**
 * Hook to get weakness alerts
 */
export function useWeaknessAlerts() {
    return useQuery({
        queryKey: ['weakness-alerts'],
        queryFn: progressApi.getWeaknessAlerts,
    });
}

/**
 * Hook to get failed activities
 */
export function useFailedActivities(levelId?: number) {
    return useQuery({
        queryKey: ['failed-activities', levelId],
        queryFn: () => progressApi.getFailedActivities(levelId),
    });
}

/**
 * Hook to dismiss alert
 */
export function useDismissAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: progressApi.dismissAlert,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weakness-alerts'] });
        },
    });
}

/**
 * Hook to start failed-only practice
 */
export function usePracticeFailed() {
    return useMutation({
        mutationFn: (levelId: number) => progressApi.practiceFailed(levelId),
    });
}

/**
 * Hook to start subject-focused session
 */
export function useStartSubjectSession() {
    return useMutation({
        mutationFn: ({ levelId, subjectId }: { levelId: number; subjectId: number }) =>
            progressApi.startSubjectSession(levelId, subjectId),
    });
}
