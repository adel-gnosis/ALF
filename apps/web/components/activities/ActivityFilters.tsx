'use client';

import React, { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useSidebarNavigation, useLevels, ACTIVITY_TYPE_INFO, ActivityType } from '@alf/shared';
import { Search, X, Filter, ChevronDown } from 'lucide-react';

interface ActivityFiltersProps {
    onFilterChange?: (filters: FilterState) => void;
}

export interface FilterState {
    course: string;
    level: string;
    subject: string;
    activityType: string;
    status: string;
    difficulty: string;
    search: string;
}

const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PENDING', label: 'Pending Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'ARCHIVED', label: 'Archived' },
];

const DIFFICULTY_OPTIONS = [
    { value: '', label: 'All Difficulties' },
    { value: 'EASY', label: 'Easy' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HARD', label: 'Hard' },
];

const ACTIVITY_TYPE_OPTIONS = [
    { value: '', label: 'All Types' },
    ...Object.entries(ACTIVITY_TYPE_INFO).map(([key, info]) => ({
        value: key,
        label: `${info.icon} ${info.label}`,
    })),
];

export default function ActivityFilters({ onFilterChange }: ActivityFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Get courses and subjects from backend
    const { data: courseNav, isLoading } = useSidebarNavigation();

    // Read current filter state from URL
    const filters: FilterState = {
        course: searchParams.get('course') || '',
        level: searchParams.get('level') || '',
        subject: searchParams.get('subject') || '',
        activityType: searchParams.get('type') || '',
        status: searchParams.get('status') || '',
        difficulty: searchParams.get('difficulty') || '',
        search: searchParams.get('search') || '',
    };

    // Get levels for selected course
    const courseId = filters.course ? parseInt(filters.course) : null;
    const { data: levels } = useLevels(courseId);

    // Get subjects for selected course
    const selectedCourse = courseNav?.find(c => String(c.id) === filters.course);
    const subjects = selectedCourse?.subjects || [];

    // Update URL when filters change
    const updateFilter = (key: keyof FilterState, value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        const urlKey = key === 'activityType' ? 'type' : key;

        if (value) {
            params.set(urlKey, value);
        } else {
            params.delete(urlKey);
        }

        // Reset dependent filters when course changes
        if (key === 'course') {
            params.delete('subject');
            params.delete('level');
        }

        // Always reset pagination when any filter changes
        params.set('page', '1');

        router.push(`${pathname}?${params.toString()}`);
    };


    // Clear all filters
    const clearFilters = () => {
        router.push(pathname);
    };

    const hasActiveFilters = Object.values(filters).some(v => v !== '');

    // Notify parent of filter changes
    useEffect(() => {
        onFilterChange?.(filters);
    }, [filters.course, filters.level, filters.subject, filters.activityType, filters.status, filters.difficulty, filters.search]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            {/* Filter Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                    {hasActiveFilters && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full text-xs font-bold">
                            Active
                        </span>
                    )}
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        Clear all
                    </button>
                )}
            </div>

            {/* Filter Grid - Updated to 7 columns to accommodate Level */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {/* Course Filter */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                        Course
                    </label>
                    <select
                        value={filters.course}
                        onChange={(e) => updateFilter('course', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    >
                        <option value="">All Courses</option>
                        {courseNav?.map(course => (
                            <option key={course.id} value={course.id}>
                                {course.flag_icon} {course.title}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Level Filter */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                        Level
                    </label>
                    <select
                        value={filters.level}
                        onChange={(e) => updateFilter('level', e.target.value)}
                        disabled={!filters.course}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">All Levels</option>
                        {levels?.map((level: any) => (
                            <option key={level.id} value={level.id}>
                                {level.code} - {level.title}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Subject Filter */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                        Subject
                    </label>
                    <select
                        value={filters.subject}
                        onChange={(e) => updateFilter('subject', e.target.value)}
                        disabled={!filters.course}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">All Subjects</option>
                        {subjects.map(subject => (
                            <option key={subject.id} value={subject.id}>
                                {subject.title}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Activity Type Filter */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                        Type
                    </label>
                    <select
                        value={filters.activityType}
                        onChange={(e) => updateFilter('activityType', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    >
                        {ACTIVITY_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status Filter */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                        Status
                    </label>
                    <select
                        value={filters.status}
                        onChange={(e) => updateFilter('status', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Difficulty Filter */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                        Difficulty
                    </label>
                    <select
                        value={filters.difficulty}
                        onChange={(e) => updateFilter('difficulty', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    >
                        {DIFFICULTY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Search */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                        Search
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => updateFilter('search', e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
