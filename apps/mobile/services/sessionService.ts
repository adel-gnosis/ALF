import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';
import type {
    StartSessionRequest,
    StartSessionResponse,
    NextActivityResponse,
    SubmitActivityRequest,
    SubmitActivityResponse,
    CompleteSessionResponse,
} from '../types/session';

// ============================================================================
// SESSION API CALLS
// ============================================================================

export const sessionApi = {
    /**
     * Start a new study session
     */
    startSession: async (data: StartSessionRequest): Promise<StartSessionResponse> => {
        const response = await api.post('/sessions/start/', data);
        return response.data;
    },

    /**
     * Get next activity for a session
     */
    getNextActivity: async (sessionId: string): Promise<NextActivityResponse> => {
        const response = await api.get(`/sessions/${sessionId}/next-activity/`);
        return response.data;
    },

    /**
     * Submit an activity answer
     */
    submitActivity: async (
        sessionId: string,
        data: SubmitActivityRequest
    ): Promise<SubmitActivityResponse> => {
        // Generate a random UUID v4 for idempotency
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        const payload = {
            ...data,
            client_attempt_uuid: data.client_attempt_uuid || uuid
        };

        console.log('[sessionService] Submitting payload:', JSON.stringify(payload, null, 2));

        try {
            const response = await api.post(`/sessions/${sessionId}/submit/`, payload);
            return response.data;
        } catch (error: any) {
            console.error('[sessionService] Submit failed. Response:', error.response?.data);
            console.error('[sessionService] Status:', error.response?.status);
            throw error;
        }
    },

    /**
     * Complete a session and get analytics
     */
    completeSession: async (sessionId: string): Promise<CompleteSessionResponse> => {
        const response = await api.post(`/sessions/${sessionId}/complete/`);
        return response.data;
    },

    /**
     * Retry level - start new set for same level
     */
    retryLevel: async (levelId: number): Promise<StartSessionResponse> => {
        const response = await api.post('/sessions/retry-level/', { level_id: levelId });
        return response.data;
    },

    /**
     * Get session history
     */
    getSessionHistory: async (levelId?: number) => {
        const params = levelId ? { level_id: levelId } : {};
        const response = await api.get('/sessions/history/', { params });
        return response.data;
    },

    /**
     * Replay a specific session (resetting it)
     */
    replaySession: async (sessionId: string): Promise<StartSessionResponse> => {
        const response = await api.post(`/sessions/${sessionId}/replay/`);
        return response.data;
    },
};

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

/**
 * Hook to start a new session
 */
export function useStartSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: sessionApi.startSession,
        onSuccess: () => {
            // Invalidate progress queries when starting new session
            queryClient.invalidateQueries({ queryKey: ['progress'] });
        },
    });
}

/**
 * Hook to get next activity
 */
export function useNextActivity(sessionId: string, enabled = true) {
    return useQuery({
        queryKey: ['session', sessionId, 'next-activity'],
        queryFn: () => sessionApi.getNextActivity(sessionId),
        enabled: enabled && !!sessionId,
        // Don't cache - always fetch fresh
        staleTime: 0,
    });
}

/**
 * Hook to submit activity
 */
export function useSubmitActivity(sessionId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SubmitActivityRequest) => sessionApi.submitActivity(sessionId, data),
    });
}

/**
 * Hook to complete session
 */
export function useCompleteSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: sessionApi.completeSession,
        onSuccess: () => {
            // Invalidate all progress-related queries
            queryClient.invalidateQueries({ queryKey: ['progress'] });
            queryClient.invalidateQueries({ queryKey: ['weakness-alerts'] });
            queryClient.invalidateQueries({ queryKey: ['failed-activities'] });
        },
    });
}

/**
 * Hook to retry level
 */
export function useRetryLevel() {
    return useMutation({
        mutationFn: (levelId: number) => sessionApi.retryLevel(levelId),
    });
}

/**
 * Hook to get session history
 */
export function useSessionHistory(levelId?: number) {
    return useQuery({
        queryKey: ['session-history', levelId],
        queryFn: () => sessionApi.getSessionHistory(levelId),
    });
}

/**
 * Hook to replay a session
 */
export function useReplaySession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (sessionId: string) => sessionApi.replaySession(sessionId),
        onSuccess: () => {
            // Invalidate progress queries
            queryClient.invalidateQueries({ queryKey: ['progress'] });
        },
    });
}


export async function rehearseMissedSession(sessionId: string) {
    const res = await api.post(`/sessions/${sessionId}/rehearse-missed/`);
    return res.data;
}
