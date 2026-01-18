'use client';

import { ACTIVITY_CATEGORIES, ActivityCategory } from '@alf/shared';
import { Filter, Search, GraduationCap, BarChart } from 'lucide-react';

interface ActivityFiltersProps {
    category?: ActivityCategory;
    difficulty?: string;
    search?: string;
    onCategoryChange: (category: ActivityCategory) => void;
    onDifficultyChange: (difficulty: string) => void;
    onSearchChange: (search: string) => void;
    onClearFilters: () => void;
}

export default function ActivityFilters({
    category = 'all',
    difficulty = '',
    search = '',
    onCategoryChange,
    onDifficultyChange,
    onSearchChange,
    onClearFilters
}: ActivityFiltersProps) {
    return (
        <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden transition-all">
            <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/30">
                <Filter className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Paramètres de Filtrage</span>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Category Filter */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            <GraduationCap className="h-3.5 w-3.5" />
                            Catégorie
                        </label>
                        <select
                            value={category}
                            onChange={(e) => onCategoryChange(e.target.value as ActivityCategory)}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all appearance-none cursor-pointer"
                        >
                            {Object.entries(ACTIVITY_CATEGORIES).map(([key, cat]) => (
                                <option key={key} value={key} className="bg-background">
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Difficulty Filter */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            <BarChart className="h-3.5 w-3.5" />
                            Difficulté
                        </label>
                        <select
                            value={difficulty}
                            onChange={(e) => onDifficultyChange(e.target.value)}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all appearance-none cursor-pointer"
                        >
                            <option value="" className="bg-background">Toutes</option>
                            <option value="EASY" className="bg-background">Facile</option>
                            <option value="MEDIUM" className="bg-background">Moyen</option>
                            <option value="HARD" className="bg-background">Difficile</option>
                        </select>
                    </div>

                    {/* Search */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            <Search className="h-3.5 w-3.5" />
                            Rechercher
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Mot-clé..."
                                className="w-full bg-background border border-border rounded-xl px-4 pr-10 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            />
                            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                        </div>
                    </div>

                    {/* Clear Button */}
                    <div className="flex items-end">
                        <button
                            onClick={onClearFilters}
                            className="w-full h-10 px-4 flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-sm font-semibold transition-all hover:shadow-md"
                        >
                            Réinitialiser
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
