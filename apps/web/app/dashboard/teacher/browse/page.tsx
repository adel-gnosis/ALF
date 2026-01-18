'use client';

'use client';

import { useBrowseActivities, useMe, ACTIVITY_CATEGORIES, ActivityCategory, TeacherActivity } from '@alf/shared';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ActivityFilters from '../../components/ActivityFilters';
import ActivityForm from '../../components/ActivityForm';
import {
    Library,
    Eye,
    Edit,
    MessageSquare,
    User,
    BarChart3,
    ChevronRight,
    SearchX
} from 'lucide-react';

export default function BrowseActivitiesPage() {
    const { data: user } = useMe();
    const searchParams = useSearchParams();
    const urlCategory = searchParams.get('category') as ActivityCategory | null;

    const [category, setCategory] = useState<ActivityCategory>(urlCategory || 'all');
    const [difficulty, setDifficulty] = useState('');
    const [search, setSearch] = useState('');

    // Form state
    const [selectedActivity, setSelectedActivity] = useState<TeacherActivity | undefined>(undefined);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSuggestion, setIsSuggestion] = useState(false);

    // Update category when URL param changes
    useEffect(() => {
        if (urlCategory && urlCategory in ACTIVITY_CATEGORIES) {
            setCategory(urlCategory);
        } else if (!urlCategory) {
            setCategory('all');
        }
    }, [urlCategory]);

    // Build activity_type param from category
    const activityType = category === 'all'
        ? undefined
        : ACTIVITY_CATEGORIES[category].types.join(',');

    const { data, isLoading, refetch } = useBrowseActivities({
        activity_type: activityType,
        difficulty: difficulty || undefined,
        search: search || undefined
    });

    const handleClearFilters = () => {
        setCategory('all');
        setDifficulty('');
        setSearch('');
    };

    const handleSuggestEdit = (activity: TeacherActivity) => {
        setSelectedActivity(activity);
        setIsSuggestion(true);
        setIsFormOpen(true);
    };

    const handleEdit = (activity: TeacherActivity) => {
        setSelectedActivity(activity);
        setIsSuggestion(false);
        setIsFormOpen(true);
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-20 animate-pulse text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-muted mb-4"></div>
            <div className="h-4 w-48 bg-muted rounded mb-2"></div>
            <div className="h-4 w-32 bg-muted rounded"></div>
        </div>
    );

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Library className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Bibliothèque d'Activités</h1>
                    </div>
                    <p className="text-muted-foreground font-medium">
                        Parcourez et suggérez des modifications aux activités validées par la communauté.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <ActivityFilters
                category={category}
                difficulty={difficulty}
                search={search}
                onCategoryChange={setCategory}
                onDifficultyChange={setDifficulty}
                onSearchChange={setSearch}
                onClearFilters={handleClearFilters}
            />

            {/* Activities Table Container */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest">
                        <BarChart3 className="h-4 w-4" />
                        <span>Résultats : {data?.total || 0}</span>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden transition-all">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Question & Détails</th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Type / Leçon</th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Auteur</th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Stats</th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {data?.activities?.map((activity) => {
                                    const isOwnActivity = activity.created_by?.id === user?.id;

                                    return (
                                        <tr key={activity.id} className="group hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                                        {activity.question_text || 'Instruction Sans Texte'}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${activity.difficulty === 'HARD' ? 'bg-red-500/10 text-red-500' :
                                                            activity.difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500' :
                                                                'bg-green-500/10 text-green-500'
                                                            }`}>
                                                            {activity.difficulty}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                            {activity.points} PTS
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-foreground">
                                                        {activity.activity_type.replace('Activity', '')}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground mt-0.5 italic">
                                                        {activity.lesson.title}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-foreground">
                                                            {activity.created_by?.username || 'Système'}
                                                        </span>
                                                        {isOwnActivity && (
                                                            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Auteur</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-black text-foreground">
                                                        {activity.average_accuracy?.toFixed(0)}%
                                                    </span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Réussite</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => alert(`Détails: ${JSON.stringify(activity, null, 2)}`)}
                                                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg border border-transparent hover:border-border transition-all"
                                                        title="Voir les détails"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>

                                                    {isOwnActivity ? (
                                                        <button
                                                            onClick={() => handleEdit(activity)}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white rounded-lg text-xs font-bold transition-all border border-green-500/20"
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                            Éditer
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSuggestEdit(activity)}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white rounded-lg text-xs font-bold transition-all border border-blue-500/20"
                                                        >
                                                            <MessageSquare className="h-3.5 w-3.5" />
                                                            Suggérer
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {data?.activities?.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 bg-muted/20">
                            <SearchX className="h-12 w-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-bold text-foreground">Aucun résultat</h3>
                            <p className="text-muted-foreground text-sm">Essayez de modifier vos filtres pour trouver ce que vous cherchez.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit/Suggest Modal */}
            <ActivityForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                editActivity={selectedActivity}
                isSuggestion={isSuggestion}
                onSuccess={() => refetch()}
            />
        </div>
    );
}
