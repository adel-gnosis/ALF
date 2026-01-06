import { create } from 'zustand';
import type { Course } from '../types/course';

interface CourseState {
    selectedCourse: Course | null;
    setSelectedCourse: (course: Course) => void;
}

export const useCourseStore = create<CourseState>((set) => ({
    selectedCourse: null,
    setSelectedCourse: (course) => set({ selectedCourse: course }),
}));
