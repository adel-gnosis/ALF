'use client';

import { useAdminTeachers, useSetPermissionLevel, TeacherPermissionLevel } from '@alf/shared';
import { useState } from 'react';

export default function AdminTeachersPage() {
    const { data, isLoading } = useAdminTeachers();
    const setPermission = useSetPermissionLevel();
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const handlePermissionChange = async (id: number, newLevel: string) => {
        if (!confirm(`Change permission to ${newLevel}?`)) return;
        setUpdatingId(id);
        try {
            await setPermission.mutateAsync({ id, level: newLevel });
        } catch (e) {
            alert('Failed to update permission');
        } finally {
            setUpdatingId(null);
        }
    };

    if (isLoading) return <div>Loading teachers...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Manage Teachers</h1>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permission</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data?.teachers?.map((teacher) => (
                            <tr key={teacher.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{teacher.username}</div>
                                    <div className="text-sm text-gray-500">{teacher.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">Activities: {teacher.stats.total_activities}</div>
                                    <div className="text-xs text-green-600">Approved: {teacher.stats.approved}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${teacher.teacher_permission_level === 'LEAD' ? 'bg-purple-100 text-purple-800' :
                                            teacher.teacher_permission_level === 'VERIFIED' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'}`}>
                                        {teacher.teacher_permission_level}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <select
                                        disabled={updatingId === teacher.id}
                                        value={teacher.teacher_permission_level}
                                        onChange={(e) => handlePermissionChange(teacher.id, e.target.value)}
                                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    >
                                        <option value={TeacherPermissionLevel.BASIC}>Basic</option>
                                        <option value={TeacherPermissionLevel.VERIFIED}>Verified</option>
                                        <option value={TeacherPermissionLevel.LEAD}>Lead</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
