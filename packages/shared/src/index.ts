// Types
export * from './types/session';
export * from './types/activity';
export type { User } from './services/user';

// Services
export * from './services/session';
export * from './services/user';
export { default as api, setTokenProvider, setApiBaseUrl, API_BASE_URL } from './services/api';
export * from './services/auth';
export * from './services/teacher';
export * from './services/admin';

// Hooks
export * from './hooks/useSession';
export * from './hooks/useLanguage';
export * from './hooks/useAuth';
export * from './hooks/useTeacher';
export * from './hooks/useAdmin';

// Constants
export * from './constants/activityCategories';

// Console Types (export first to establish Difficulty type)
export * from './types/console';

// Activity Wizard (exports ActivityType and re-exports Difficulty from console)
export * from './types/activityWizard';
export * from './hooks/useActivityWizard';