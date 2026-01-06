export interface Course {
    id: number;
    code: string;
    title: string;
    course_type: 'LANGUAGE' | 'MATH' | 'SCIENCE' | 'OTHER';
    description: string;
    icon: string;
    color: string;
    order: number;
}

export interface Level {
    id: number;
    title: string;
    description: string;
    code: string;
    order: number;
    image_url?: string;
    course: number;
}

export interface Subject {
    id: number;
    code: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    order: number;
    course: number;
}
