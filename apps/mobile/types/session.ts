// User Types
export interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    native_language: string;
    total_xp: number;
    current_streak: number;
    placement_completed: boolean;
    level_info?: {
        current_level: number;
        level_id: number;
    };
}

// Session Types
export interface Session {
    id: string;
    level: Level;
    subject?: Subject;
    session_type: 'MIXED' | 'SUBJECT_FOCUSED' | 'CUSTOM';
    target_activities: number;
    activities_completed: number;
    correct_answers: number;
    accuracy_percentage: number;
    total_points_earned: number;
    started_at: string;
    ended_at?: string;
    duration_seconds?: number;
    outcome: 'IN_PROGRESS' | 'PASSED' | 'RETRY' | 'DOWNGRADE' | 'COMPLETED';
    set_number: number;
}

export interface Level {
    id: number;
    title: string;
    description: string;
    cefr_code: string;
    order: number;
    image_url?: string;
}

export interface Subject {
    id: number;
    code: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    order: number;
}

// Activity Types
export interface BaseActivity {
    id: number;
    lesson: {
        id: number;
        title: string;
        level: Level;
        subject: Subject;
    };
    question_text: string;
    explanation?: string;
    points: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    order: number;
    resourcetype: string;
}

export interface MCQActivity extends BaseActivity {
    resourcetype: 'MCQActivity';
    choices: string[];
    correct_answer_index: number;
}

export interface FillBlankActivity extends BaseActivity {
    resourcetype: 'FillBlankActivity';
    correct_answer: string;
}

export interface MatchingActivity extends BaseActivity {
    resourcetype: 'MatchingActivity';
    pairs: Record<string, string>;
}

export interface DragOrderActivity extends BaseActivity {
    resourcetype: 'DragOrderActivity';
    words: string[];
    correct_order: string[];
}

export interface ConjugationActivity extends BaseActivity {
    resourcetype: 'ConjugationActivity';
    verb_infinitive: string;
    tense: string;
    pronoun: string;
    correct_conjugation: string;
}

export interface MultipleAnswerActivity extends BaseActivity {
    resourcetype: 'MultipleAnswerActivity';
    choices: string[];
    correct_indices: number[];
}

export interface TextInputActivity extends BaseActivity {
    resourcetype: 'TextInputActivity';
    correct_answers: string[];
    case_sensitive: boolean;
    accept_partial: boolean;
}

export interface DicteeActivity extends BaseActivity {
    resourcetype: 'DicteeActivity';
    audio_urls: string[];
    correct_text: string;
    case_sensitive: boolean;
}

export type Activity =
    | MCQActivity
    | FillBlankActivity
    | MatchingActivity
    | DragOrderActivity
    | ConjugationActivity
    | MultipleAnswerActivity
    | TextInputActivity
    | DicteeActivity;

// Session API Response Types
export interface StartSessionRequest {
    level_id: number;
    subject_id?: number;
    target_activities?: number;
}

export interface StartSessionResponse {
    session_id: string;
    session_type: string;
    set_number: number;
    level: Level;
    subject?: Subject;
    message: string;
}

export interface NextActivityResponse {
    activity?: Activity;
    is_retry: boolean;
    retry_info?: {
        times_failed: number;
        last_failed: string;
        priority: number;
    };
    progress: {
        completed: number;
        target: number;
        percentage: number;
    };
    session_complete: boolean;
}

export interface SubmitActivityRequest {
    activity_id: number;
    user_answer: any;
    time_spent?: number;
    client_attempt_uuid?: string;
}

export interface SubmitActivityResponse {
    is_correct: boolean;
    correct_answer?: any;
    explanation?: string;
    points_earned: number;
    session_progress: {
        completed: number;
        target: number;
        current_accuracy: number;
    };
    feedback?: string;
}

export interface SubjectBreakdown {
    subject: string;
    subject_id: number;
    total: number;
    correct: number;
    accuracy: number;
    strength: 'STRONG' | 'AVERAGE' | 'WEAK';
}

export interface Recommendation {
    type: 'SUBJECT_FOCUS' | 'RETRY_SET' | 'DOWNGRADE' | 'NEXT_LEVEL';
    message: string;
    action?: string;
    weak_subjects?: Array<{ id: number; name: string }>;
    suggested_level?: number;
}

export interface CompleteSessionResponse {
    passed: boolean;
    accuracy: number;
    outcome: string;
    next_action: string;
    message: string;
    subject_breakdown: SubjectBreakdown[];
    weak_subjects: any[];
    recommendations: Recommendation[];
    suggested_level?: number;
}
