import api from './api';
import { Session, StartSessionResponse, SessionHistoryItem } from '../types/session';

export const sessionApi = {
    startSession: async (levelId: number): Promise<StartSessionResponse> => {
        const response = await api.post('/sessions/start/', { level_id: levelId });
        return response.data;
    },

    getSession: async (sessionId: string): Promise<Session> => {
        const response = await api.get(`/sessions/${sessionId}/`);
        return response.data;
    },

    getNextActivity: async (sessionId: string): Promise<any> => {
        const response = await api.get(`/sessions/${sessionId}/next-activity/`);
        return response.data;
    },

    getHistory: async (): Promise<SessionHistoryItem[]> => {
        const response = await api.get('/sessions/history/');
        return response.data;
    },

    submitActivity: async (sessionId: string, data: any): Promise<any> => {
        const response = await api.post(`/sessions/${sessionId}/submit/`, data);
        return response.data;
    },

    completeSession: async (sessionId: string): Promise<any> => {
        const response = await api.post(`/sessions/${sessionId}/complete/`);
        return response.data;
    }
};
