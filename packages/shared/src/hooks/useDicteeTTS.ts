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
        // male_default, male_slow, female_default, female_slow
        const voicesCount = (voices?.length ?? 0) || 4; // Changed from 1 to 4
        const speedsCount = (speeds?.length ?? 0) || 1;
        const expectedNew = voicesCount * speedsCount;
        setExpectedTotalUrls(initialAudioUrlsCount + expectedNew);

        console.log(`TTS Trigger: Expecting ${expectedNew} new files (${voicesCount} voices × ${speedsCount} speeds)`);

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
            console.log('TTS polling stopped');
        };

        // Polling logic
        pollInterval = setInterval(async () => {
            try {
                // Reuse existing detail API
                const data = await teacherApi.getActivityDetail(dicteeId);
                // Background usually flattens the polymorphic fields, so check both to be safe
                const currentUrls = (data as any).audio_urls || data.type_specific_data?.audio_urls || [];

                const target = expectedTotalUrls ?? (initialAudioUrlsCount + 4); // Changed from +1 to +4

                console.log(`TTS Polling: ${currentUrls.length}/${target} files ready`, currentUrls);

                // Update UI progressively as files arrive (show partial results)
                if (currentUrls.length > initialAudioUrlsCount) {
                    setGeneratedUrls(currentUrls);
                    queryClient.setQueryData(['teacher-activity', dicteeId], data);
                    queryClient.invalidateQueries({ queryKey: ['teacher-activities'] });
                }

                // Stop only when ALL expected urls are ready
                if (currentUrls.length >= target) {
                    console.log(`✅ TTS generation complete: ${currentUrls.length}/${target} files`);
                    stopPolling();
                }

            } catch (err) {
                console.error('TTS Polling error:', err);
                // We keep polling unless it's a critical failure or timeout
            }
        }, 3000); // Poll every 3 seconds

        // Timeout logic (180 seconds = 3 minutes)
        timeoutId = setTimeout(() => {
            console.warn('⚠️ TTS generation timeout reached (3 minutes)');
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