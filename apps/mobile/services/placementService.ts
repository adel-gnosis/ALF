import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';
import type { Level } from '../types/session';

// ============================================================================
// PLACEMENT TEST API CALLS
// ============================================================================

export const placementApi = {
    /**
     * Start a placement test
     */
    startPlacementTest: async (courseId?: number) => {
        const response = await api.post('/placement/start/', { course_id: courseId });
        return response.data;
    },

    /**
     * Get next placement question
     */
    getNextQuestion: async (sessionId: string) => {
        const response = await api.get(`/placement/${sessionId}/next/`);
        return response.data;
    },

    /**
     * Submit placement answer
     */
    submitAnswer: async (sessionId: string, data: { activity_id: number; user_answer: any }) => {
        const response = await api.post(`/placement/${sessionId}/answer/`, data);
        return response.data;
    },

    /**
     * Complete placement test
     */
    completePlacementTest: async (sessionId: string) => {
        const response = await api.post(`/placement/${sessionId}/complete/`);
        return response.data;
    },
};

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

export function useStartPlacementTest() {
    return useMutation({
        mutationFn: (courseId?: number) => placementApi.startPlacementTest(courseId),
    });
}

export function usePlacementQuestion(sessionId: string, enabled = true) {
    return useQuery({
        queryKey: ['placement', sessionId, 'next'],
        queryFn: () => placementApi.getNextQuestion(sessionId),
        enabled: enabled && !!sessionId,
        staleTime: 0,
    });
}

export function useSubmitPlacementAnswer(sessionId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { activity_id: number; user_answer: any }) =>
            placementApi.submitAnswer(sessionId, data),
        // onSuccess removed to allow manual control of "Next" navigation
    });
}

export function useCompletePlacementTest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: placementApi.completePlacementTest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['progress'] });
        },
    });
}
