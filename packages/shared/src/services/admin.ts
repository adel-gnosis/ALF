import api from './api';
import { AdminReviewItem, TeacherSummary, TeacherActivity } from '../types/console';

export const adminApi = {
    getPendingReview: async (): Promise<{ total_pending: number, activities: AdminReviewItem[] }> => {
        const response = await api.get('/admin/review/pending/');
        return response.data;
    },

    // NEW: Get all activities (admin view)
    getAllActivities: async (params?: {
        status?: string;
        activity_type?: string;
        created_by_me?: boolean;
    }): Promise<{ total: number, activities: TeacherActivity[] }> => {
        const response = await api.get('/teacher/activities/my-content/', { params });
        return response.data;
    },

    approveActivity: async (id: number): Promise<{ status: string }> => {
        const response = await api.post(`/admin/review/${id}/approve/`);
        return response.data;
    },

    rejectActivity: async (id: number, reason: string): Promise<{ status: string }> => {
        const response = await api.post(`/admin/review/${id}/reject/`, { reason });
        return response.data;
    },

    getTeachers: async (): Promise<{ total_teachers: number, teachers: TeacherSummary[] }> => {
        const response = await api.get('/admin/teachers/');
        return response.data;
    },

    setPermissionLevel: async (id: number, level: string): Promise<{ permission_level: string }> => {
        const response = await api.post(`/admin/teachers/${id}/set-permission-level/`, { level });
        return response.data;
    }
};