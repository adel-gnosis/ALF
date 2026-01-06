import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionApi } from '../services/session';

export const useSession = (sessionId: string) => {
    return useQuery({
        queryKey: ['session', sessionId],
        queryFn: () => sessionApi.getSession(sessionId),
        enabled: !!sessionId,
    });
};

export const useNextActivity = (sessionId: string) => {
    return useQuery({
        queryKey: ['session-next-activity', sessionId],
        queryFn: () => sessionApi.getNextActivity(sessionId),
        enabled: !!sessionId,
    });
};

export const useStartSession = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (levelId: number) => sessionApi.startSession(levelId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['session-history'] });
        }
    });
};

export const useSessionHistory = () => {
    return useQuery({
        queryKey: ['session-history'],
        queryFn: sessionApi.getHistory
    });
};

export const useSubmitActivity = (sessionId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => sessionApi.submitActivity(sessionId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
        }
    });
};

export const useCompleteSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (sessionId: string) => sessionApi.completeSession(sessionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['session-history'] });
        }
    });
};
