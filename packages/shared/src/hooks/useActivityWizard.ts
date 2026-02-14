/**
 * React Query hooks for Activity Creation Wizard
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import api from '../services/api';
import {
    Course,
    Level,
    Subject,
    Lesson,
    I18nKey,
    ActivityType,
    SUBJECT_ACTIVITY_MAPPING
} from '../types/activityWizard';

// Fetch courses
export const useCourses = () => {
    return useQuery<Course[]>({
        queryKey: ['courses'],
        queryFn: async () => {
            const response = await api.get('/courses/');
            return response.data;
        }
    });
};

// Fetch levels for a course
export const useLevels = (courseId: number | null) => {
    return useQuery<Level[]>({
        queryKey: ['levels', courseId],
        queryFn: async () => {
            const response = await api.get('/levels/', {
                params: { course_id: courseId }
            });
            return response.data;
        },
        enabled: !!courseId
    });
};

// Fetch subjects for a course
export const useSubjects = (courseId: number | null) => {
    return useQuery<Subject[]>({
        queryKey: ['subjects', courseId],
        queryFn: async () => {
            const response = await api.get('/subjects/', {
                params: { course_id: courseId }
            });
            return response.data;
        },
        enabled: !!courseId
    });
};

// Fetch lessons for level + subject
export const useLessons = (levelId: number | null, subjectId: number | null) => {
    return useQuery<{ count: number; lessons: Lesson[] }>({
        queryKey: ['lessons', levelId, subjectId],
        queryFn: async () => {
            const response = await api.get('/lessons/for-wizard/', {
                params: {
                    level_id: levelId,
                    subject_id: subjectId
                }
            });
            return response.data;
        },
        enabled: !!levelId && !!subjectId
    });
};

// Fetch i18n instruction keys
type UseI18nKeysParams = {
    activityType?: string;
    subject?: string | null;
    scope?: 'instruction';
    includeAllLangs?: boolean;
};

export const useI18nKeys = ({
    activityType,
    subject,
    scope = 'instruction',
    includeAllLangs = true,
}: UseI18nKeysParams) => {
    return useQuery({
        // Use an object in the key for better change detection and avoidance of null/undefined ambiguity
        queryKey: ['i18n-templates', { activityType, subject, scope, includeAllLangs }],
        queryFn: async () => {
            const params: any = {
                scope,
                include_all_langs: includeAllLangs ? 1 : 0
            };
            if (activityType && activityType !== 'all') params.activity_type = activityType;
            if (subject && subject !== 'all') params.subject = subject;

            const response = await api.get('/i18n/instruction-keys/', { params });
            return response.data;
        },
        enabled: true,
        // Ensure we don't hold onto stale cache entries too aggressively during selection
        staleTime: 0,
    });
};


// Get available activity types for a subject
export const useAvailableActivityTypes = (subjectCode: string | null) => {
    return useMemo(() => {
        if (!subjectCode) return [];

        // Check if we have a specific mapping for this subject
        const mapped = SUBJECT_ACTIVITY_MAPPING[subjectCode.toUpperCase()];
        if (mapped) return mapped;

        // Default: all activity types available
        return Object.keys(SUBJECT_ACTIVITY_MAPPING).flatMap(
            key => SUBJECT_ACTIVITY_MAPPING[key]
        ).filter((v, i, a) => a.indexOf(v) === i); // unique
    }, [subjectCode]);
};

// Course with embedded subjects for sidebar navigation
export interface CourseWithSubjects extends Course {
    subjects: Subject[];
}

// Fetch courses with their subjects for sidebar navigation
export const useSidebarNavigation = () => {
    const { data: courses, isLoading: loadingCourses } = useCourses();

    return useQuery<CourseWithSubjects[]>({
        queryKey: ['sidebar-navigation', courses?.map(c => c.id)],
        queryFn: async () => {
            if (!courses) return [];

            // Fetch all subjects at once
            const response = await api.get('/subjects/');
            const allSubjects: Subject[] = response.data;

            // Group subjects by course
            return courses.map(course => ({
                ...course,
                subjects: allSubjects.filter(s => s.course === course.id)
            }));
        },
        enabled: !!courses && courses.length > 0,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });
};
