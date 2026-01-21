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
    const [expectedTotalUrls, setExpectedTotalUrls] = useState<number | null>(null);

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

    const triggerTTS = (voices?: string[], speeds?: string[], explicitId?: number) => {
        const id = explicitId || dicteeId;
        if (!id) {
            setError('No Dictee ID provided');
            return;
        }
        setIsTimeout(false);
        
        // FIXED: Backend now generates 4 canonical variants by default
        // If no voices specified, expect 4 variants (male_default, male_slow, female_default, female_rhythm)
        const voicesCount = (voices?.length ?? 0) || 4; // Changed from 1 to 4
        const speedsCount = (speeds?.length ?? 0) || 1;
        const expectedNew = voicesCount * speedsCount;
        setExpectedTotalUrls(initialAudioUrlsCount + expectedNew);

        triggerMutation.mutate({
            dictee_id: id,
            voices: voices || [],
            speeds: speeds || []
        });
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
                const data = await teacherApi.getActivityDetail(dicteeId);
                const currentUrls = (data as any).audio_urls || data.type_specific_data?.audio_urls || [];

                const target = expectedTotalUrls ?? (initialAudioUrlsCount + 4); // Changed from +1 to +4

                // Update UI progressively as files arrive
                if (currentUrls.length > initialAudioUrlsCount) {
                    setGeneratedUrls(currentUrls);
                    queryClient.setQueryData(['teacher-activity', dicteeId], data);
                    queryClient.invalidateQueries({ queryKey: ['teacher-activities'] });
                }

                // Stop when ALL expected urls are ready
                if (currentUrls.length >= target) {
                    console.log(`TTS generation complete: ${currentUrls.length}/${target} files`);
                    stopPolling();
                }

            } catch (err) {
                console.error('TTS Polling error:', err);
            }
        }, 3000);

        // Timeout (3 minutes)
        timeoutId = setTimeout(() => {
            console.warn('TTS generation timeout reached');
            setIsTimeout(true);
            stopPolling();
        }, 180000);

        return () => {
            if (pollInterval) clearInterval(pollInterval);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isGenerating, dicteeId, initialAudioUrlsCount, expectedTotalUrls, queryClient]);

    return {
        triggerTTS,
        isGenerating: isGenerating || triggerMutation.isPending,
        error,
        isTimeout,
        setIsTimeout,
        generatedUrls
    };
};