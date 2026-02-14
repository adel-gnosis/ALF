'use client';

import { useAdminTeachers, useSetPermissionLevel, TeacherPermissionLevel } from '@alf/shared';
import { useState } from 'react';
import { Shield, User, Crown, Search, Filter, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function AdminTeachersPage() {
    const [filters, setFilters] = useState({
        search: '',
        user_type: '',
        permission_level: '',
        has_activities: '',
        ordering: '-date_joined'
    });

    const { data, isLoading } = useAdminTeachers(filters);
    const setPermission = useSetPermissionLevel();
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const handlePermissionChange = async (id: number, newLevel: string) => {
        if (!confirm(`Change permission to ${newLevel}?`)) return;
        setUpdatingId(id);
        try {
            await setPermission.mutateAsync({ id, level: newLevel });
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to update permission');
        } finally {
            setUpdatingId(null);
        }
    };

    const getUserTypeBadge = (type: string) => {
        switch (type) {
            case 'superadmin':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400">
                        <Crown className="w-3 h-3" />
                        Superadmin
                    </span>
                );
            case 'admin':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-400">
                        <Shield className="w-3 h-3" />
                        Admin
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400">
                        <User className="w-3 h-3" />
                        Teacher
                    </span>
                );
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            user_type: '',
            permission_level: '',
            has_activities: '',
            ordering: '-date_joined'
        });
    };

    const activeFiltersCount = [
        filters.search,
        filters.user_type,
        filters.permission_level,
        filters.has_activities
    ].filter(Boolean).length;

    if (isLoading) return <div className="flex items-center justify-center py-20">Loading users...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Instructors</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-slate-400">
                    <span>{data?.total_users || 0} total users</span>
                    {data?.can_manage_admins && (
                        <span className="text-green-600 dark:text-green-400">(Superadmin view)</span>
                    )}
                    {data?.user_breakdown && (
                        <span>
                            {data.user_breakdown.teachers} Teachers • {data.user_breakdown.admins} Admins • {data.user_breakdown.superadmins} Superadmins
                        </span>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
                    {activeFiltersCount > 0 && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                            {activeFiltersCount} active
                        </span>
                    )}
                    {activeFiltersCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="ml-auto text-xs text-primary hover:underline"
                        >
                            Clear all
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Search */}
                    <div className="relative lg:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by username or email..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                        />
                    </div>

                    {/* User Type */}
                    <select
                        value={filters.user_type}
                        onChange={(e) => handleFilterChange('user_type', e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    >
                        <option value="">All User Types</option>
                        <option value="teacher">Teachers</option>
                        <option value="admin">Admins</option>
                        <option value="superadmin">Superadmins</option>
                    </select>

                    {/* Permission Level */}
                    <select
                        value={filters.permission_level}
                        onChange={(e) => handleFilterChange('permission_level', e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    >
                        <option value="">All Permission Levels</option>
                        <option value="BASIC">Basic</option>
                        <option value="VERIFIED">Verified</option>
                        <option value="LEAD">Lead</option>
                    </select>

                    {/* Activity Status */}
                    <select
                        value={filters.has_activities}
                        onChange={(e) => handleFilterChange('has_activities', e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    >
                        <option value="">All Activity Status</option>
                        <option value="true">Has Activities</option>
                        <option value="false">No Activities</option>
                    </select>
                </div>

                {/* Sorting */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">Sort by:</span>
                    <select
                        value={filters.ordering}
                        onChange={(e) => handleFilterChange('ordering', e.target.value)}
                        className="px-3 py-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    >
                        <option value="-date_joined">Newest First</option>
                        <option value="date_joined">Oldest First</option>
                        <option value="username">Username A-Z</option>
                        <option value="-username">Username Z-A</option>
                        <option value="email">Email A-Z</option>
                        <option value="-email">Email Z-A</option>
                    </select>
                </div>
            </div>

            {/* Results */}
            <div className="bg-white dark:bg-slate-800 shadow rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Stats</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Teacher Level</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {data?.teachers?.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <User className="w-12 h-12 text-gray-300 dark:text-slate-600" />
                                        <p className="text-gray-500 dark:text-slate-400">No users found</p>
                                        {activeFiltersCount > 0 && (
                                            <button
                                                onClick={clearFilters}
                                                className="text-sm text-primary hover:underline"
                                            >
                                                Clear filters
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data?.teachers?.map((user) => {
                                const isAdminUser = user.user_type === 'admin' || user.user_type === 'superadmin';

                                return (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</div>
                                                    <div className="text-sm text-gray-500 dark:text-slate-400">{user.email}</div>
                                                    {user.last_activity_date && (
                                                        <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                                                            Last activity: {new Date(user.last_activity_date).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getUserTypeBadge(user.user_type)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                <div className="font-medium">Activities: {user.stats.total_activities}</div>
                                                <div className="flex items-center gap-2 mt-1 text-xs">
                                                    <span className="text-green-600 dark:text-green-400">✓ {user.stats.approved}</span>
                                                    <span className="text-yellow-600 dark:text-yellow-400">⏳ {user.stats.pending}</span>
                                                    <span className="text-red-600 dark:text-red-400">✗ {user.stats.rejected}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                {user.is_active && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400 w-fit">
                                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                                        Active
                                                    </span>
                                                )}
                                                {user.has_pending && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400 w-fit">
                                                        <Clock className="w-3 h-3" />
                                                        Has Pending
                                                    </span>
                                                )}
                                                {user.has_rejected && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400 w-fit">
                                                        <AlertCircle className="w-3 h-3" />
                                                        Has Rejected
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {!isAdminUser && (
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${user.teacher_permission_level === 'LEAD' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400' :
                                                        user.teacher_permission_level === 'VERIFIED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400' :
                                                            'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400'}`}>
                                                    {user.teacher_permission_level}
                                                </span>
                                            )}
                                            {isAdminUser && (
                                                <span className="text-xs text-gray-400 dark:text-slate-500 italic">N/A (Admin)</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {!isAdminUser ? (
                                                <select
                                                    disabled={updatingId === user.id}
                                                    value={user.teacher_permission_level}
                                                    onChange={(e) => handlePermissionChange(user.id, e.target.value)}
                                                    className="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <option value={TeacherPermissionLevel.BASIC}>Basic</option>
                                                    <option value={TeacherPermissionLevel.VERIFIED}>Verified</option>
                                                    <option value={TeacherPermissionLevel.LEAD}>Lead</option>
                                                </select>
                                            ) : (
                                                <span className="text-xs text-gray-400 dark:text-slate-500 italic">
                                                    {data?.can_manage_admins ? 'Admin (manage via user settings)' : 'Cannot manage admins'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}