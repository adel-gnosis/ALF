import api from './api';
import { AdminReviewItem, TeacherSummary, TeacherActivity, AdminTeachersResponse, DashboardStats } from '../types/console';

export const adminApi = {
    getPendingReview: async (): Promise<{ total_pending: number, activities: AdminReviewItem[] }> => {
        const response = await api.get('/admin/review/pending/');
        return response.data;
    },

    // Get all activities (admin view - from ALL users)
    getAllActivities: async (params?: {
        status?: string;
        activity_type?: string;
        created_by_me?: boolean;
        course_id?: string;
        subject_id?: string;
        level_id?: string;
        difficulty?: string;
        search?: string;
        page?: number;
        page_size?: number;
    }): Promise<{
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
        activities: TeacherActivity[];
    }> => {
        const response = await api.get('/admin/review/all-activities/', { params });
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

    // Get version diff for review comparison
    getVersionDiff: async (id: number): Promise<{
        current: {
            id: number;
            version: number;
            status: string;
            activity_type: string;
            data: any;
        };
        previous: {
            id: number;
            version: number;
            status: string;
            activity_type: string;
            data: any;
        } | null;
        diff: {
            content: Array<{
                field: string;
                field_label: string;
                old: any;
                new: any;
                change_type: 'added' | 'removed' | 'modified';
                is_semantic?: boolean;
            }>;
            meta: Array<{
                field: string;
                field_label: string;
                old: any;
                new: any;
                change_type: 'added' | 'removed' | 'modified';
            }>;
            has_content_changes: boolean;
            has_meta_changes: boolean;
        };
        has_changes: boolean;
        has_content_changes: boolean;
        version_notes: string | null;
        modified_by: { id: number; username: string } | null;
    }> => {
        const response = await api.get(`/admin/review/${id}/diff/`);
        return response.data;
    },

    getTeachers: async (params?: {
        search?: string;
        user_type?: string;
        permission_level?: string;
        has_activities?: boolean;
        ordering?: string;
    }): Promise<AdminTeachersResponse> => {
        const response = await api.get('/admin/teachers/', { params });
        return response.data;
    },

    getDashboardStats: async (): Promise<DashboardStats> => {
        const response = await api.get('/admin/teachers/dashboard-stats/');
        return response.data;
    },

    setPermissionLevel: async (id: number, level: string): Promise<{ permission_level: string }> => {
        const response = await api.post(`/admin/teachers/${id}/set-permission-level/`, { level });
        return response.data;
    }
};