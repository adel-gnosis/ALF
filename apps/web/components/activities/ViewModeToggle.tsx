'use client';

import React from 'react';
import { LayoutGrid, List, Layers } from 'lucide-react';

export type ViewMode = 'cards' | 'table' | 'grouped';

interface ViewModeToggleProps {
    mode: ViewMode;
    onChange: (mode: ViewMode) => void;
}

const VIEW_MODES: { mode: ViewMode; icon: React.ComponentType<any>; label: string }[] = [
    { mode: 'cards', icon: LayoutGrid, label: 'Cards' },
    { mode: 'table', icon: List, label: 'Table' },
    { mode: 'grouped', icon: Layers, label: 'Grouped' },
];

export default function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
    return (
        <div className="inline-flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-700 rounded-lg">
            {VIEW_MODES.map(({ mode: m, icon: Icon, label }) => (
                <button
                    key={m}
                    onClick={() => onChange(m)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === m
                            ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                        }`}
                    title={label}
                >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                </button>
            ))}
        </div>
    );
}
