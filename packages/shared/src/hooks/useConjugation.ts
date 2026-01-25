import { useQuery } from '@tanstack/react-query';
import { ConjugationService, ConjugationRequest, ConjugationResult } from '../services/conjugation';

export const useConjugateVerb = (params: ConjugationRequest, enabled: boolean = false) => {
    return useQuery<ConjugationResult>({
        queryKey: ['conjugation', params.verb, params.tense],
        queryFn: () => ConjugationService.resolve(params),
        enabled: enabled && !!params.verb && !!params.tense,
        retry: false,
    });
};
