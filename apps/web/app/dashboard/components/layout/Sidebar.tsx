'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    Library,
    ClipboardList,
    Users,
    ChevronRight,
    LogOut,
    Sparkles,
    GraduationCap,
    Settings,
    X,
    Plus,
    ChevronDown
} from 'lucide-react';
import { useLogout, UserRole, useMe, useSidebarNavigation, CourseWithSubjects } from '@alf/shared';
import ActivityCreationWizard from '@/components/ActivityCreationWizard';
import { useI18n } from '../../../../context/I18nContext';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const logout = useLogout();
    const { data: user } = useMe();
    const { t, isRTL } = useI18n();

    // Manage expansion of courses and their subjects
    const [expandedCourses, setExpandedCourses] = useState<Set<number>>(new Set());

    // Fetch courses with subjects for navigation
    const { data: courseNav, isLoading: loadingCourses } = useSidebarNavigation();

    // NEW: Wizard modal state
    const [showWizard, setShowWizard] = useState(false);

    const isActive = (path: string) => pathname === path;
    const isSubjectActive = (courseId: number, subjectId: number) => {
        return (
            (pathname.includes('/browse') || pathname.includes('/admin/activities')) &&
            searchParams.get('course') === String(courseId) &&
            searchParams.get('subject') === String(subjectId)
        );
    };

    const isCourseActive = (courseId: number) => {
        return (
            (pathname.includes('/browse') || pathname.includes('/admin/activities')) &&
            searchParams.get('course') === String(courseId)
        );
    };


    const toggleCourse = (courseId: number) => {
        setExpandedCourses(prev => {
            const next = new Set(prev);
            if (next.has(courseId)) {
                next.delete(courseId);
            } else {
                next.add(courseId);
            }
            return next;
        });
    };

    const MenuItem = ({ href, icon: Icon, label, active, variant = 'default' }: {
        href: string;
        icon: any;
        label: string;
        active: boolean;
        variant?: 'default' | 'cta'
    }) => (
        <Link
            href={href}
            onClick={() => { if (window.innerWidth < 1024) onClose(); }}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all rounded-xl ${variant === 'cta'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 ring-1 ring-white/20 hover:bg-blue-500'
                : active
                    ? 'bg-blue-600/10 text-blue-600 shadow-sm ring-1 ring-blue-500/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
        >
            <Icon className={`h-5 w-5 ${variant === 'cta' ? 'text-white' : active ? 'text-blue-600' : 'text-muted-foreground'}`} />
            <span>{label}</span>
        </Link>
    );

    // Course Navigation component - shows courses with expandable subjects
    const CourseNavigation = ({ basePath, label, icon: Icon }: { basePath: string; label: string; icon: any }) => {
        const isHeaderActive = isActive(basePath) && !searchParams.get('course');


        if (loadingCourses) {
            return (
                <div className="space-y-2 px-4">
                    <div className="h-10 bg-muted animate-pulse rounded-xl" />
                    <div className="h-8 bg-muted/50 animate-pulse rounded-lg ml-4" />
                    <div className="h-8 bg-muted/50 animate-pulse rounded-lg ml-4" />
                </div>
            );
        }

        return (
            <div className="space-y-1">
                {/* Main header link */}
                <Link
                    href={basePath}
                    onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all rounded-xl ${isHeaderActive
                        ? 'bg-blue-600/10 text-blue-600 shadow-sm ring-1 ring-blue-500/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                >
                    <Icon className={`h-5 w-5 ${isHeaderActive ? 'text-blue-600' : 'text-muted-foreground'}`} />
                    <span>{label}</span>
                </Link>

                {/* Course list */}
                <div className="mt-1 pl-4 space-y-1">
                    {courseNav?.map(course => {
                        const courseActive = isCourseActive(course.id);
                        const isExpanded = expandedCourses.has(course.id) || courseActive;


                        return (
                            <div key={course.id} className="space-y-0.5">
                                {/* Course header */}
                                <div className="flex items-center">
                                    <Link
                                        href={`${basePath}?course=${course.id}`}
                                        onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                                        className={`flex-1 flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${courseActive
                                            ? 'text-primary bg-primary/10'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                            }`}
                                    >
                                        <span className="text-base">{course.flag_icon || (course.course_type === 'MATH' ? '🔢' : '📚')}</span>
                                        <span>{course.title}</span>
                                    </Link>
                                    {course.subjects.length > 0 && (
                                        <button
                                            onClick={() => toggleCourse(course.id)}
                                            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                                            title={isExpanded ? t('nav.collapse') : t('nav.expand')}
                                        >
                                            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                                        </button>
                                    )}
                                </div>

                                {/* Subjects list */}
                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="pl-4 py-1 border-l-2 border-primary/10 space-y-0.5 ml-3">
                                        {course.subjects.map(subject => (
                                            <Link
                                                key={subject.id}
                                                href={`${basePath}?course=${course.id}&subject=${subject.id}`}
                                                onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                                                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${isSubjectActive(course.id, subject.id)
                                                    ? 'text-primary bg-primary/10'
                                                    : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted'
                                                    }`}
                                            >
                                                <div className={`h-1.5 w-1.5 rounded-full transition-colors ${isSubjectActive(course.id, subject.id) ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                                                {subject.title}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed top-0 left-0 z-50 h-full w-72 transform bg-bg-sidebar border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo Section */}
                <div className="flex h-20 items-center justify-between px-6 border-b border-border bg-gradient-to-r from-blue-600/5 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg ring-2 ring-blue-400/20">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-foreground tracking-tight">ALF <span className="text-blue-500">Cockpit</span></span>
                            <span className="text-[10px] uppercase font-bold text-blue-400 leading-none">Management v2</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex flex-col h-[calc(100%-12rem)] px-4 py-8 overflow-y-auto scrollbar-hide">
                    <nav className="space-y-8">
                        {/* Common Section */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <MenuItem
                                    href="/dashboard"
                                    icon={LayoutDashboard}
                                    label={t('nav.home')}
                                    active={isActive('/dashboard')}
                                />

                                {/* NEW: Create Activity button opens wizard */}
                                <button
                                    onClick={() => {
                                        setShowWizard(true);
                                        if (window.innerWidth < 1024) onClose(); // Close sidebar on mobile
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 ring-1 ring-white/20 hover:bg-blue-500"
                                >
                                    <Plus className="h-5 w-5 text-white" />
                                    <span>{t('nav.create_activity')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Teacher Section */}
                        {user?.role === UserRole.TEACHER && (
                            <div className="space-y-4">
                                <div className="px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <GraduationCap className="h-3.5 w-3.5 text-primary/60" />
                                    <span>{t('nav.teaching_center')}</span>
                                </div>
                                <div className="space-y-2">
                                    <MenuItem
                                        href="/dashboard/teacher/activities"
                                        icon={BookOpen}
                                        label={t('nav.my_activities')}
                                        active={isActive('/dashboard/teacher/activities')}
                                    />

                                    {/* ✅ Review Queue - Lead Teachers + Admins */}
                                    {user.teacher_permission_level === 'LEAD' && (
                                        <MenuItem
                                            href="/dashboard/admin/review"
                                            icon={ClipboardList}
                                            label={t('nav.review_queue')}
                                            active={isActive('/dashboard/admin/review')}
                                        />
                                    )}

                                    <CourseNavigation
                                        basePath="/dashboard/teacher/browse"
                                        label={t('nav.public_library')}
                                        icon={Library}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Admin Section */}
                        {user?.role === UserRole.ADMIN && (
                            <div className="space-y-4">
                                <div className="px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Settings className="h-3.5 w-3.5 text-primary/60" />
                                    <span>{t('nav.control_panel')}</span>
                                </div>
                                <div className="space-y-2">
                                    <MenuItem
                                        href="/dashboard/admin/activities?mine=true"
                                        icon={BookOpen}
                                        label={t('nav.my_activities')}
                                        active={isActive('/dashboard/admin/activities') && pathname.includes('mine=true')}
                                    />

                                    <MenuItem
                                        href="/dashboard/admin/review"
                                        icon={ClipboardList}
                                        label={t('nav.review_queue')}
                                        active={isActive('/dashboard/admin/review')}
                                    />

                                    <CourseNavigation
                                        basePath="/dashboard/admin/activities"
                                        label={t('nav.all_content')}
                                        icon={ClipboardList}
                                    />

                                    <MenuItem
                                        href="/dashboard/admin/teachers"
                                        icon={Users}
                                        label={t('nav.instructor_mgmt')}
                                        active={isActive('/dashboard/admin/teachers')}
                                    />
                                </div>
                            </div>
                        )}
                    </nav>
                </div>

                {/* Footer Section */}
                <div className="absolute bottom-0 w-full p-4 border-t border-border bg-bg-sidebar/80 backdrop-blur-md">
                    <button
                        onClick={logout}
                        className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-red-500/20">
                            <LogOut className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col items-start translate-y-0.5">
                            <span className="font-bold">{t('common.logout')}</span>
                            <span className="text-[10px] text-muted-foreground/60">{t('nav.end_session')}</span>
                        </div>
                    </button>
                </div>
            </aside>

            {/* NEW: Activity Creation Wizard Modal */}
            <ActivityCreationWizard
                isOpen={showWizard}
                onClose={() => setShowWizard(false)}
                onSuccess={() => {
                    // Optionally redirect to activities page or refresh data
                    // For now, just close the modal
                    setShowWizard(false);
                }}
            />
        </>
    );
}