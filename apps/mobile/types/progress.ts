export interface UserProgress {
    id: number;
    level: {
        id: number;
        title: string;
        cefr_code: string;
        order: number;
    };
    status: 'LOCKED' | 'ACTIVE' | 'COMPLETED';
    total_activities: number;
    completed_activities: number;
    correct_answers: number;
    total_attempts: number;
    completion_percentage: number;
    accuracy_percentage: number;
    started_at?: string;
    completed_at?: string;
    retry_count: number;
    is_passed: boolean;
    needs_downgrade: boolean;
    can_proceed_to_next: boolean;
}

export interface SubjectProgress {
    id: number;
    level: {
        id: number;
        title: string;
        cefr_code: string;
    };
    subject: {
        id: number;
        code: string;
        title: string;
        color: string;
    };
    status: 'LOCKED' | 'ACTIVE' | 'COMPLETED';
    total_activities: number;
    completed_activities: number;
    correct_answers: number;
    total_attempts: number;
    completion_percentage: number;
    accuracy_percentage: number;
    started_at?: string;
    completed_at?: string;
}

export interface ProgressOverview {
    current_level?: number;
    overall_accuracy: number;
    levels: UserProgress[];
}

export interface WeaknessAlert {
    id: number;
    level: {
        id: number;
        cefr_code: string;
        title: string;
    };
    subject: {
        id: number;
        title: string;
        color: string;
    };
    sessions_analyzed: number;
    average_accuracy: number;
    severity: 'MINOR' | 'MODERATE' | 'CRITICAL';
    message: string;
    recommendation: string;
    is_active: boolean;
    dismissed_at?: string;
    created_at: string;
}

export interface FailedActivity {
    id: number;
    activity: any;
    level: any;
    subject: any;
    first_failed_at: string;
    times_failed: number;
    priority: number;
    is_resolved: boolean;
    resolved_at?: string;
}

export interface FailedActivitiesResponse {
    total_failed: number;
    by_subject: Record<string, number>;
    activities: FailedActivity[];
}

export interface WeaknessAnalysis {
    overall_accuracy: number;
    subject_performance: Array<{
        subject_id: number;
        subject_name: string;
        avg_accuracy: number;
        total_attempts: number;
        total_correct: number;
        strength_level: 'STRONG' | 'AVERAGE' | 'WEAK';
    }>;
    weak_subjects: any[];
    active_alerts: any[];
    recommendations: Array<{
        type: string;
        priority: string;
        subject_id: number;
        subject_name: string;
        message: string;
        action: any;
    }>;
}
