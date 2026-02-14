'use client';

import { Clock, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, XCircle, Users, Award, Activity } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { DashboardStats, ActivityStatus } from '@alf/shared';
import Link from 'next/link';

// Recent Activity Timeline Widget
export function RecentActivityTimeline({ timeline }: { timeline: DashboardStats['recent_timeline'] }) {
    const { t } = useI18n();

    const getStatusIcon = (status: ActivityStatus) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'REJECTED': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'PENDING': return <Clock className="w-4 h-4 text-yellow-500" />;
            default: return <Activity className="w-4 h-4 text-gray-400" />;
        }
    };

    const getStatusColor = (status: ActivityStatus) => {
        switch (status) {
            case 'APPROVED': return 'text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400 dark:border dark:border-green-500/20';
            case 'REJECTED': return 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 dark:border dark:border-red-500/20';
            case 'PENDING': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border dark:border-yellow-500/20';
            default: return 'text-gray-600 bg-gray-50 dark:bg-gray-500/10 dark:text-gray-400 dark:border dark:border-gray-500/20';
        }
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    return (
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-1 bg-primary rounded-full"></div>
                <h3 className="text-xl font-bold text-foreground">Recent Activity</h3>
            </div>

            <div className="space-y-3">
                {timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
                ) : (
                    timeline.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                        >
                            <div className="mt-0.5">{getStatusIcon(item.status)}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm text-foreground">
                                        {item.activity_type}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(item.status)}`}>
                                        {item.status.toLowerCase()}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {item.created_by ? `by @${item.created_by.username}` : 'Unknown'} • {item.lesson_title}
                                </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {getTimeAgo(item.created_at)}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Week Comparison Widget
export function WeekComparison({ comparison }: { comparison: DashboardStats['week_comparison'] }) {
    const getTrendIcon = (change: number) => {
        if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
        if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
        return <Minus className="w-4 h-4 text-gray-400" />;
    };

    const getTrendColor = (change: number) => {
        if (change > 0) return 'text-green-600 dark:text-green-400';
        if (change < 0) return 'text-red-600 dark:text-red-400';
        return 'text-gray-600 dark:text-gray-400';
    };

    return (
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-1 bg-primary rounded-full"></div>
                <h3 className="text-xl font-bold text-foreground">This Week vs Last Week</h3>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border/50">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Activities Created</p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                            {comparison.this_week.activities_created}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {getTrendIcon(comparison.changes.activities)}
                        <span className={`text-lg font-semibold ${getTrendColor(comparison.changes.activities)}`}>
                            {comparison.changes.activities > 0 ? '+' : ''}{comparison.changes.activities}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border/50">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Approvals</p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                            {comparison.this_week.approvals}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {getTrendIcon(comparison.changes.approvals)}
                        <span className={`text-lg font-semibold ${getTrendColor(comparison.changes.approvals)}`}>
                            {comparison.changes.approvals > 0 ? '+' : ''}{comparison.changes.approvals}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Teacher Leaderboard Widget
export function TeacherLeaderboard({ leaderboard }: { leaderboard: DashboardStats['leaderboard'] }) {
    const getMedalIcon = (index: number) => {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return `${index + 1}.`;
    };

    return (
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-1 bg-primary rounded-full"></div>
                <h3 className="text-xl font-bold text-foreground">Top Contributors</h3>
                <span className="text-xs text-muted-foreground ml-auto">This Month</span>
            </div>

            <div className="space-y-2">
                {leaderboard.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No activity this month</p>
                ) : (
                    leaderboard.map((teacher, index) => (
                        <div
                            key={teacher.id}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                        >
                            <span className="text-lg font-bold w-8 text-center">
                                {getMedalIcon(index)}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">
                                    @{teacher.username}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {teacher.approved_count} approved
                                </p>
                            </div>
                            <span className="text-lg font-bold text-foreground">
                                {teacher.activity_count}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Activity Type Distribution Widget
export function ActivityTypeDistribution({ distribution }: { distribution: DashboardStats['activity_type_distribution'] }) {
    const entries = Object.entries(distribution).sort((a, b) => b[1].percentage - a[1].percentage);

    const getBarColor = (index: number) => {
        const colors = [
            'bg-blue-500',
            'bg-purple-500',
            'bg-green-500',
            'bg-yellow-500',
            'bg-pink-500',
            'bg-indigo-500',
            'bg-red-500',
            'bg-teal-500',
        ];
        return colors[index % colors.length];
    };

    return (
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-1 bg-primary rounded-full"></div>
                <h3 className="text-xl font-bold text-foreground">Activity Types</h3>
            </div>

            <div className="space-y-3">
                {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No activities yet</p>
                ) : (
                    entries.map(([type, data], index) => (
                        <div key={type}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-foreground">{type}</span>
                                <span className="text-sm font-semibold text-muted-foreground">
                                    {data.percentage}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${getBarColor(index)} transition-all duration-500`}
                                    style={{ width: `${data.percentage}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{data.count} activities</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Alerts Widget
export function AlertsWidget({ alerts }: { alerts: DashboardStats['alerts'] }) {
    const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
        switch (priority) {
            case 'high': return 'border-red-500 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20';
            case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 dark:border-yellow-500/20';
            case 'low': return 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/20';
        }
    };

    const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
        switch (priority) {
            case 'high': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'medium': return <Clock className="w-5 h-5 text-yellow-500" />;
            case 'low': return <Activity className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-1 bg-primary rounded-full"></div>
                <h3 className="text-xl font-bold text-foreground">Needs Attention</h3>
            </div>

            <div className="space-y-3">
                {alerts.length === 0 ? (
                    <div className="text-center py-8">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">All caught up! 🎉</p>
                    </div>
                ) : (
                    alerts.map((alert, index) => (
                        <div
                            key={index}
                            className={`flex items-start gap-3 p-4 rounded-lg border-l-4 ${getPriorityColor(alert.priority)}`}
                        >
                            {getPriorityIcon(alert.priority)}
                            <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">{alert.message}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Student Impact Widget (for teachers)
export function StudentImpactWidget({ impact }: { impact: DashboardStats['student_impact'] }) {
    if (!impact) return null;

    return (
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-1 bg-primary rounded-full"></div>
                <h3 className="text-xl font-bold text-foreground">Your Impact</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-background rounded-xl p-4 border border-border/50">
                    <Users className="w-6 h-6 text-purple-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">{impact.students_reached}</p>
                    <p className="text-xs text-muted-foreground mt-1">Students Reached</p>
                </div>

                <div className="bg-background rounded-xl p-4 border border-border/50">
                    <Activity className="w-6 h-6 text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">{impact.total_attempts}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Attempts</p>
                </div>

                <div className="bg-background rounded-xl p-4 border border-border/50">
                    <CheckCircle2 className="w-6 h-6 text-green-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">{impact.average_success_rate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Success Rate</p>
                </div>

                <div className="bg-background rounded-xl p-4 border border-border/50">
                    <Award className="w-6 h-6 text-yellow-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">{impact.total_points_earned}</p>
                    <p className="text-xs text-muted-foreground mt-1">Points Earned</p>
                </div>
            </div>
        </div>
    );
}

export function QuickActionsWidget({ userRole }: { userRole: 'admin' | 'teacher' }) {
    return (
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-1 bg-primary rounded-full"></div>
                <h3 className="text-xl font-bold text-foreground">Quick Actions</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {userRole === 'admin' ? (
                    <>
                        <Link
                            href="/console/review"
                            className="flex flex-col items-center gap-2 p-4 bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20"
                        >
                            <Clock className="w-6 h-6 text-primary" />
                            <span className="text-sm font-medium text-foreground">Review Queue</span>
                        </Link>

                        <Link
                            href="/console/teachers"
                            className="flex flex-col items-center gap-2 p-4 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl transition-colors border border-purple-500/20"
                        >
                            <Users className="w-6 h-6 text-purple-500" />
                            <span className="text-sm font-medium text-foreground">Manage Teachers</span>
                        </Link>
                    </>
                ) : (
                    <>
                        <Link
                            href="/console/activities/create"
                            className="flex flex-col items-center gap-2 p-4 bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20"
                        >
                            <Activity className="w-6 h-6 text-primary" />
                            <span className="text-sm font-medium text-foreground">Create Activity</span>
                        </Link>

                        <Link
                            href="/console/activities"
                            className="flex flex-col items-center gap-2 p-4 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition-colors border border-blue-500/20"
                        >
                            <CheckCircle2 className="w-6 h-6 text-blue-500" />
                            <span className="text-sm font-medium text-foreground">View All</span>
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}