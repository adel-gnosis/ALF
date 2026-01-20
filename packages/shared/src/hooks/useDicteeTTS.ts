import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherApi } from '../services/teacher';

interface UseDicteeTTSResult {
    triggerTTS: (voices: string[], speeds: string[], explicitId?: number) => void;
    isGenerating: boolean;
    error: string | null;
    isTimeout: boolean;
    setIsTimeout: (value: boolean) => void;
    generatedUrls: string[];
}

export const useDicteeTTS = (dicteeId: number, initialAudioUrlsCount: number): UseDicteeTTSResult => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isTimeout, setIsTimeout] = useState(false);
    const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
    const queryClient = useQueryClient();

    const triggerMutation = useMutation({
        mutationFn: teacherApi.triggerDicteeTTS,
        onSuccess: () => {
            setIsGenerating(true);
            setError(null);
            setIsTimeout(false);
            setGeneratedUrls([]);
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'Failed to trigger TTS generation');
            setIsGenerating(false);
        }
    });

    const triggerTTS = (voices: string[], speeds: string[], explicitId?: number) => {
        const id = explicitId || dicteeId;
        if (!id) {
            setError('No Dictee ID provided');
            return;
        }
        setIsTimeout(false);
        triggerMutation.mutate({ dictee_id: id, voices, speeds });
    };

    useEffect(() => {
        if (!isGenerating) return;

        let pollInterval: any;
        let timeoutId: any;

        const stopPolling = () => {
            if (pollInterval) clearInterval(pollInterval);
            if (timeoutId) clearTimeout(timeoutId);
            setIsGenerating(false);
        };

        // Polling logic
        pollInterval = setInterval(async () => {
            try {
                // Reuse existing detail API
                const data = await teacherApi.getActivityDetail(dicteeId);
                // Background usually flattens the polymorphic fields, so check both to be safe
                const currentUrls = (data as any).audio_urls || data.type_specific_data?.audio_urls || [];

                if (currentUrls.length > initialAudioUrlsCount) {
                    setGeneratedUrls(currentUrls);
                    // Update react-query cache with fresh data
                    queryClient.setQueryData(['teacher-activity', dicteeId], data);
                    // Also update the general activities list to be safe
                    queryClient.invalidateQueries({ queryKey: ['teacher-activities'] });
                    stopPolling();
                }
            } catch (err) {
                console.error('TTS Polling error:', err);
                // We keep polling unless it's a critical failure or timeout
            }
        }, 3000);

        // Timeout logic (180 seconds = 3 minutes)
        timeoutId = setTimeout(() => {
            setIsTimeout(true);
            stopPolling();
        }, 180000);

        return () => {
            if (pollInterval) clearInterval(pollInterval);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isGenerating, dicteeId, initialAudioUrlsCount, queryClient]);

    return {
        triggerTTS,
        isGenerating: isGenerating || triggerMutation.isPending,
        error,
        isTimeout,
        setIsTimeout,
        generatedUrls
    };
};
