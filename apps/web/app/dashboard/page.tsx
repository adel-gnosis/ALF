'use client';

import { useMe, useTeacherStats, UserRole, usePendingReviews, useAdminTeachers, useDashboardStats } from '@alf/shared';
import {
    Users,
    Layers,
    Target,
    Clock,
    CheckCircle2,
    AlertCircle,
    FileEdit,
    BookOpen,
    Activity as ActivityIcon
} from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import {
    RecentActivityTimeline,
    WeekComparison,
    TeacherLeaderboard,
    ActivityTypeDistribution,
    AlertsWidget,
    StudentImpactWidget,
    QuickActionsWidget
} from './DashboardWidgets';

function StatCard({ label, value, icon: Icon, colorClass, gradientClass }: { label: string; value: string | number; icon: any; colorClass: string; gradientClass: string }) {
    return (
        <div className="bg-card group rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colorClass.split(' ')[0]} bg-opacity-10 transition-colors group-hover:${gradientClass}`}>
                    <Icon className={`h-6 w-6 ${colorClass.split(' ')[1]}`} />
                </div>
                <div className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{value}</div>
            </div>
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
        </div>
    );
}

function TeacherOverview() {
    const { data: stats, isLoading: statsLoading } = useTeacherStats();
    const { data: dashboardStats, isLoading: dashboardLoading } = useDashboardStats();
    const { t } = useI18n();

    if (statsLoading || dashboardLoading) return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-32 bg-muted rounded-2xl"></div>)}
        </div>
    );
    if (!stats) return null;

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-extrabold text-foreground tracking-tight">{t('dashboard.welcome')}</h2>
                <p className="text-muted-foreground font-medium">{t('dashboard.stats_intro')}</p>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    label={t('dashboard.total_activities')}
                    value={stats.total_activities_created}
                    icon={BookOpen}
                    colorClass="bg-blue-500 text-blue-500"
                    gradientClass="bg-blue-600"
                />
                <StatCard
                    label={t('dashboard.students_reached')}
                    value={stats.students_reached}
                    icon={Users}
                    colorClass="bg-purple-500 text-purple-500"
                    gradientClass="bg-purple-600"
                />
                <StatCard
                    label={t('dashboard.avg_accuracy')}
                    value={`${stats.average_accuracy}%`}
                    icon={Target}
                    colorClass="bg-green-500 text-green-500"
                    gradientClass="bg-green-600"
                />
            </div>

            {/* Activity Distribution */}
            <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-8 w-1 bg-primary rounded-full"></div>
                    <h3 className="text-xl font-bold text-foreground">{t('dashboard.distribution_title')}</h3>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { key: 'APPROVED', icon: CheckCircle2, color: 'text-green-500', label: t('dashboard.approved') },
                        { key: 'PENDING', icon: Clock, color: 'text-yellow-500', label: t('dashboard.pending') },
                        { key: 'DRAFT', icon: FileEdit, color: 'text-slate-400', label: t('dashboard.draft') },
                        { key: 'REJECTED', icon: AlertCircle, color: 'text-red-500', label: t('dashboard.rejected') },
                    ].map((item) => (
                        <div key={item.key} className="relative group overflow-hidden bg-background rounded-xl p-5 border border-border/50 hover:border-primary/20 transition-all">
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{item.label}</span>
                                    <span className="text-2xl font-bold text-foreground">{stats.activities_by_status[item.key] || 0}</span>
                                </div>
                                <item.icon className={`h-8 w-8 ${item.color} opacity-20 group-hover:opacity-40 transition-opacity`} />
                            </div>
                            <div className={`absolute bottom-0 left-0 h-1 bg-current ${item.color} w-full opacity-10`}></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Dashboard Widgets */}
            {dashboardStats && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <RecentActivityTimeline timeline={dashboardStats.recent_timeline} />
                        <StudentImpactWidget impact={dashboardStats.student_impact} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ActivityTypeDistribution distribution={dashboardStats.activity_type_distribution} />
                        <QuickActionsWidget userRole="teacher" />
                    </div>

                    <AlertsWidget alerts={dashboardStats.alerts} />
                </>
            )}
        </div>
    );
}

function AdminOverview() {
    const { data: reviews } = usePendingReviews();
    const { data: teachersData } = useAdminTeachers();
    const { data: dashboardStats, isLoading } = useDashboardStats();
    const { t } = useI18n();

    if (isLoading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-2xl"></div>)}
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-extrabold text-foreground tracking-tight">{t('dashboard.system_console')}</h2>
                <p className="text-muted-foreground font-medium">{t('dashboard.system_monitor')}</p>
                {teachersData?.user_breakdown && (
                    <p className="text-sm text-muted-foreground mt-2">
                        {teachersData.user_breakdown.teachers} Teachers • {teachersData.user_breakdown.admins} Admins • {teachersData.user_breakdown.superadmins} Superadmins
                    </p>
                )}
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Pending Review"
                    value={reviews?.total_pending || 0}
                    icon={Clock}
                    colorClass="bg-amber-500 text-amber-500"
                    gradientClass="bg-amber-600"
                />
                <StatCard
                    label="Teachers"
                    value={teachersData?.user_breakdown?.teachers || 0}
                    icon={Users}
                    colorClass="bg-blue-500 text-blue-500"
                    gradientClass="bg-blue-600"
                />
                <StatCard
                    label="Total Activities"
                    value={teachersData?.system_stats?.total_activities || 0}
                    icon={Layers}
                    colorClass="bg-purple-500 text-purple-500"
                    gradientClass="bg-purple-600"
                />
                <StatCard
                    label="Activities Today"
                    value={teachersData?.system_stats?.activities_today || 0}
                    icon={ActivityIcon}
                    colorClass="bg-green-500 text-green-500"
                    gradientClass="bg-green-600"
                />
            </div>

            {/* Dashboard Widgets */}
            {dashboardStats && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AlertsWidget alerts={dashboardStats.alerts} />
                        <WeekComparison comparison={dashboardStats.week_comparison} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TeacherLeaderboard leaderboard={dashboardStats.leaderboard} />
                        <ActivityTypeDistribution distribution={dashboardStats.activity_type_distribution} />
                    </div>

                    <RecentActivityTimeline timeline={dashboardStats.recent_timeline} />

                    <QuickActionsWidget userRole="admin" />
                </>
            )}
        </div>
    );
}

export default function DashboardPage() {
    const { data: user } = useMe();
    const { t } = useI18n();

    if (!user) return null;

    return (
        <div className="py-2">
            {user.role === UserRole.ADMIN ? (
                <AdminOverview />
            ) : user.role === UserRole.TEACHER ? (
                <TeacherOverview />
            ) : (
                <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-foreground">{t('dashboard.restricted_access')}</h2>
                    <p className="text-muted-foreground mt-2 max-w-sm mx-auto">{t('dashboard.restricted_desc')}</p>
                </div>
            )}
        </div>
    );
}