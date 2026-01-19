import api from './api';
import { TeacherActivity, ActivityPerformance, TeacherStats } from '../types/console';

export const teacherApi = {
    createActivity: async (data: any): Promise<TeacherActivity> => {
        const response = await api.post('/teacher/activities/create/', data);
        return response.data;
    },

    getMyContent: async (params?: { status?: string, lesson_id?: number }): Promise<{ total: number, activities: TeacherActivity[] }> => {
        const response = await api.get('/teacher/activities/my-content/', { params });
        return response.data;
    },

    getActivityDetail: async (id: number): Promise<TeacherActivity> => {
        const response = await api.get(`/teacher/activities/${id}/`);
        return response.data;
    },

    browseActivities: async (params?: {
        activity_type?: string;
        lesson_id?: number;
        subject_id?: number;
        level_id?: number;
        difficulty?: string;
        search?: string;
    }): Promise<{ total: number, activities: TeacherActivity[] }> => {
        const response = await api.get('/teacher/activities/browse/', { params });
        return response.data;
    },

    editActivity: async (id: number, data: any): Promise<{
        id: number;
        status: string;
        version: number;
        message: string;
        is_new_version: boolean;
        needs_approval: boolean;
        is_suggestion: boolean;
    }> => {
        const response = await api.patch(`/teacher/activities/${id}/edit/`, data);
        return response.data;
    },

    deleteActivity: async (id: number): Promise<void> => {
        await api.delete(`/teacher/activities/${id}/`);
    },

    submitForReview: async (id: number): Promise<{ status: string }> => {
        const response = await api.post(`/teacher/activities/${id}/submit-for-review/`);
        return response.data;
    },

    getPerformance: async (id: number): Promise<ActivityPerformance> => {
        const response = await api.get(`/teacher/activities/${id}/performance/`);
        return response.data;
    },

    getStatsOverview: async (): Promise<TeacherStats> => {
        const response = await api.get('/teacher/stats/overview/');
        return response.data;
    },

    triggerDicteeTTS: async (data: {
        dictee_id: number;
        voices: string[];
        speeds: string[];
    }): Promise<{ triggered: boolean, dictee_id: number, voices: string, speeds: string }> => {
        const response = await api.post('/dictee/trigger-tts/', data);
        return response.data;
    }
};
