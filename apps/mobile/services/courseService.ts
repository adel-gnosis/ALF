import api from './api';
import type { Course, Level, Subject } from '../types/course';

export const courseApi = {
    getCourses: async (): Promise<Course[]> => {
        const response = await api.get('/courses/');
        return response.data;
    },

    getLevels: async (courseId?: number): Promise<Level[]> => {
        const params = courseId ? { course_id: courseId } : {};
        const response = await api.get('/levels/', { params });
        return response.data;
    },

    getSubjects: async (courseId?: number): Promise<Subject[]> => {
        const params = courseId ? { course_id: courseId } : {};
        const response = await api.get('/subjects/', { params });
        return response.data;
    }
};

export default courseApi;
