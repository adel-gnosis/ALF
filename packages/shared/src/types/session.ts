export interface Session {
    id: string;
    type: 'LEARNING' | 'REVIEW' | 'QUIZ';
    status: 'COMPLETED' | 'IN_PROGRESS' | 'ABANDONED';
    started_at: string;
    completed_at?: string;
    score?: number;
}

export interface SessionHistoryItem {
    id: string;
    date: string;
    accuracy: number;
    duration: string; // "10:30"
    status: 'COMPLETED' | 'FAILED' | 'ABANDONED';
}

export interface StartSessionResponse {
    session_id: string;
    session_type: string;
    set_number: number;
    message: string;
}
