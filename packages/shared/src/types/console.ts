export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin'
}

export enum ActivityStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export enum TeacherPermissionLevel {
  BASIC = 'BASIC',
  VERIFIED = 'VERIFIED',
  LEAD = 'LEAD'
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole | string;
  native_language: string;
  first_name?: string;
  last_name?: string;
  level_info?: {
    current_level: number;
    level_id: number;
  };
  // Admin fields
  teacher_permission_level?: TeacherPermissionLevel;
  can_publish_directly?: boolean;
}

export interface LoginResponse {
  refresh: string;
  access: string;
  user: User;
}

export interface TeacherActivity {
  id: number;
  activity_type: string;
  lesson: {
    id: number;
    title: string;
    level: string;
    subject: string;
  };
  question_text: string;
  status: ActivityStatus;
  version: number;
  difficulty: Difficulty;
  points: number;
  explanation?: string;
  created_at: string;
  updated_at: string;
  total_attempts?: number;
  average_accuracy?: number;
  // Detail fields
  type_specific_data?: any;
  version_notes?: string;
  rejection_reason?: string;
  // Creator & modifier info
  created_by?: {
    id: number;
    username: string;
  };
  modified_by?: {
    id: number;
    username: string;
  };
}

export interface MediaFile {
  name: string;
  url: string;
  type: 'image' | 'audio';
  size: number;
  modified_at: number;
}

export interface ActivityPerformance {
  activity_id: number;
  total_attempts: number;
  unique_students: number;
  average_accuracy: number;
  median_time_seconds: number;
  flagged_count: number;
  needs_review: boolean;
}

export interface TeacherStats {
  total_activities_created: number;
  activities_by_status: Record<string, number>;
  students_reached: number;
  total_student_attempts: number;
  average_accuracy: number;
  pending_feedback_count: number;
  permission_level: string;
  can_publish_directly: boolean;
}

export interface AdminReviewItem {
  id: number;
  activity_type: string;
  lesson: {
    id: number;
    title: string;
    level: string;
    subject: string;
  };
  question_text: string;
  difficulty: Difficulty;
  points: number;
  created_by: {
    id: number;
    username: string;
    permission_level: string;
  };
  submitted_at: string;
  version: number;
  version_notes?: string;
  modified_by?: {
    id: number;
    username: string;
  } | null;
}

export interface TeacherSummary {
  id: number;
  username: string;
  email: string;
  is_teacher_approved: boolean;
  teacher_permission_level: TeacherPermissionLevel;
  can_publish_directly: boolean;
  date_joined: string;
  stats: {
    total_activities: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}