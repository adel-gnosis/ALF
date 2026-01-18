import { useState, useMemo, useEffect } from 'react';
import { useI18nKeys, useSubjects, ACTIVITY_TYPE_INFO, ActivityType } from '@alf/shared';
import { useI18n } from '../../context/I18nContext';
import { Search, X, Check, ChevronRight, Settings2, BookOpen, Layers, Filter } from 'lucide-react';
import SubjectIcon from '../SubjectIcon';

interface InstructionKeyPickerProps {
    activityType: ActivityType;
    subjectCode: string | null;
    selectedKey: string;
    onSelect: (key: string) => void;
    courseId?: number | null; // Optional: to filter subjects by current course
}

export default function InstructionKeyPicker({
    activityType,
    subjectCode,
    selectedKey,
    onSelect,
    courseId = null
}: InstructionKeyPickerProps) {
    const { t, locale, isRTL } = useI18n();
    const [isOpen, setIsOpen] = useState(false);

    // Filtering state
    const [selectedType, setSelectedType] = useState<string | 'all'>(activityType);
    const [selectedSubject, setSelectedSubject] = useState<string | 'all'>(subjectCode || 'all');
    const [searchQuery, setSearchQuery] = useState('');
    const [hasInteracted, setHasInteracted] = useState(false);

    // Sync state only if the user hasn't interacted yet
    useEffect(() => {
        if (!hasInteracted && subjectCode && selectedSubject === 'all') {
            setSelectedSubject(subjectCode);
        }
    }, [subjectCode, hasInteracted, selectedSubject]);

    const { data: subjects } = useSubjects(courseId);

    const { data: i18nResp, isLoading, isFetching } = useI18nKeys({
        activityType: selectedType as ActivityType,
        subject: selectedSubject,
    });

    const templates = i18nResp?.results ?? [];

    const isDataLoading = isLoading || isFetching;

    const filteredTemplates = useMemo(() => {
        if (!searchQuery) return templates;
        const q = searchQuery.toLowerCase();
        return templates.filter((tpl: any) =>
            tpl.key.toLowerCase().includes(q) ||
            (tpl.label_en || '').toLowerCase().includes(q) ||
            (tpl.label_fr || '').toLowerCase().includes(q) ||
            (tpl.label_ar || '').toLowerCase().includes(q)
        );
    }, [templates, searchQuery]);

    const getLocalizedLabel = (item: any) => {
        if (!item) return '';
        if (locale === 'ar') return item.label_ar || item.label || item.key;
        if (locale === 'en') return item.label_en || item.label || item.key;
        return item.label_fr || item.label || item.key;
    };

    // Find current template either in results or fetch if needed
    // For now, we rely on the list or show the key itself
    const currentTemplate = templates.find((tpl: any) => tpl.key === selectedKey);

    return (
        <div className="w-full">
            {/* Trigger Button/UI */}
            <div
                onClick={() => setIsOpen(true)}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-3 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all group shadow-sm hover:shadow-md"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/20 flex items-center justify-center text-xl shadow-inner">
                            📝
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">
                                {t('wizard.instruction_label')}
                            </div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[300px]">
                                {currentTemplate ? getLocalizedLabel(currentTemplate) : (selectedKey || t('wizard.generic_instruction_fallback'))}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-[11px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded transition-colors group-hover:bg-blue-600 group-hover:text-white">
                            {t('common.change')}
                        </div>
                        <ChevronRight className={`w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-transform ${isRTL ? 'rotate-180' : ''}`} />
                    </div>
                </div>
                {selectedKey && (
                    <div className="mt-2 pt-2 border-t border-gray-50 dark:border-slate-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <code className="text-[9px] px-1.5 py-0.5 rounded bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 font-mono">
                                {selectedKey}
                            </code>
                        </div>
                        <div className="flex items-center gap-1">
                            {selectedSubject !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title={t('wizard.filtered_by_subject')} />}
                            {selectedType !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title={t('wizard.filtered_by_activity_type')} />}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl h-[750px] max-h-[90vh] rounded-2xl shadow-2xl border dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        {/* Header */}
                        <div className="p-4 md:p-6 border-b dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                                        <Settings2 className="w-4 h-4" />
                                    </div>
                                    {t('wizard.instruction_picker_title')}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                    {t('wizard.instruction_picker_desc')}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {/* Search & Filters Area - Compact Single Line */}
                        <div className="p-4 md:px-6 bg-gray-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800 shrink-0">
                            <div className="flex flex-col md:flex-row gap-3 items-end">
                                {/* Search */}
                                <div className="flex-1 w-full space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                        <Search className="w-3 h-3" /> {t('common.search')}
                                    </label>
                                    <div className="relative">
                                        <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={t('wizard.search_instructions')}
                                            className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm`}
                                        />
                                    </div>
                                </div>

                                {/* Activity Type Dropdown */}
                                <div className="w-full md:w-48 space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                        <Layers className="w-3 h-3" /> {t('wizard.filter_activity_type')}
                                    </label>
                                    <select
                                        value={selectedType}
                                        onChange={(e) => {
                                            setSelectedType(e.target.value);
                                            setHasInteracted(true);
                                        }}
                                        className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium h-[38px]"
                                    >
                                        <option value="all">🌐 {t('wizard.show_all_templates')}</option>
                                        {Object.entries(ACTIVITY_TYPE_INFO).map(([key, info]) => (
                                            <option key={key} value={key}>
                                                {info.icon} {t(`wizard.activity_type_${key}`)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Subject Dropdown */}
                                <div className="w-full md:w-48 space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                        <BookOpen className="w-3 h-3" /> {t('wizard.filter_subject')}
                                    </label>
                                    <select
                                        value={selectedSubject}
                                        onChange={(e) => {
                                            setSelectedSubject(e.target.value);
                                            setHasInteracted(true);
                                        }}
                                        className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium h-[38px]"
                                    >
                                        <option value="all">🌐 {t('wizard.show_all_templates')}</option>
                                        {subjects?.map((s) => (
                                            <option key={s.id} value={s.code}>
                                                {s.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* List Area */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-gray-50/30 dark:bg-slate-900/30 min-h-0">
                            {/* Counter and Status */}
                            <div className="flex items-center justify-between mb-4 sticky top-0 bg-gray-50/5 dark:bg-slate-900/5 backdrop-blur-sm py-1 z-10">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Filter className="w-3 h-3 text-blue-500" />
                                    {t('wizard.templates_count').replace('{count}', filteredTemplates.length.toString())}
                                </span>
                            </div>

                            {isDataLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-28 bg-white dark:bg-slate-800/50 border dark:border-slate-800 animate-pulse rounded-2xl" />
                                    ))}
                                </div>
                            ) : filteredTemplates.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {filteredTemplates.map((item: any) => {
                                        const isSelected = selectedKey === item.key;
                                        return (
                                            <div
                                                key={item.key}
                                                onClick={() => {
                                                    onSelect(item.key);
                                                    setIsOpen(false);
                                                }}
                                                className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${isSelected
                                                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-600/10 ring-1 ring-blue-500/50 shadow-md'
                                                    : 'border-white dark:border-slate-800/50 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800/40 shadow-sm hover:shadow-md'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/40 border border-purple-100 dark:border-purple-800/50 shadow-sm shrink-0">
                                                                {subjects?.find(s => s.code === item.subject_code)?.icon ? (
                                                                    <SubjectIcon name={subjects.find(s => s.code === item.subject_code)?.icon} className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                                ) : (
                                                                    <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                                )}
                                                            </div>
                                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                                {getLocalizedLabel(item)}
                                                            </h4>
                                                            {isSelected && (
                                                                <span className="shrink-0 scale-75 p-1 bg-blue-500 text-white rounded-full">
                                                                    <Check className="w-3 h-3" />
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Previews - Only other 2 languages */}
                                                        <div className="space-y-1.5 pl-2 border-l-2 border-gray-100 dark:border-slate-800/60 ml-2.5">
                                                            {locale !== 'fr' && item.label_fr && (
                                                                <div className="flex items-center gap-3">
                                                                    <span className="shrink-0 w-6 text-[7px] font-black text-gray-400 dark:text-slate-600 uppercase text-center border dark:border-slate-800 rounded px-1">FR</span>
                                                                    <span className="text-[10px] text-gray-600 dark:text-slate-400 italic line-clamp-1">{item.label_fr}</span>
                                                                </div>
                                                            )}
                                                            {locale !== 'en' && item.label_en && (
                                                                <div className="flex items-center gap-3">
                                                                    <span className="shrink-0 w-6 text-[7px] font-black text-gray-400 dark:text-slate-600 uppercase text-center border dark:border-slate-800 rounded px-1">EN</span>
                                                                    <span className="text-[10px] text-gray-600 dark:text-slate-400 italic line-clamp-1">{item.label_en}</span>
                                                                </div>
                                                            )}
                                                            {locale !== 'ar' && item.label_ar && (
                                                                <div className="flex items-center gap-3 flex-row-reverse" dir="rtl">
                                                                    <span className="shrink-0 w-6 text-[7px] font-black text-gray-400 dark:text-slate-600 uppercase text-center border dark:border-slate-800 rounded px-1">AR</span>
                                                                    <span className="text-[10px] text-gray-600 dark:text-slate-400 font-bold line-clamp-1">{item.label_ar}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSelected
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                        : 'bg-gray-50 dark:bg-slate-900 text-gray-300 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-500/30'
                                                        }`}>
                                                        <Check className="w-5 h-5 transition-transform group-hover:scale-110" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center mb-6 text-4xl shadow-inner border border-dashed dark:border-slate-700">
                                        📭
                                    </div>
                                    <h4 className="text-base font-bold text-gray-900 dark:text-white">{t('wizard.no_templates_found')}</h4>
                                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-2 max-w-[200px]">
                                        {t('wizard.no_templates_found_desc')}
                                    </p>
                                    <button
                                        onClick={() => {
                                            setSelectedType('all');
                                            setSelectedSubject('all');
                                            setSearchQuery('');
                                        }}
                                        className="mt-6 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider hover:underline"
                                    >
                                        {t('wizard.clear_filters')}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800 flex items-center justify-between text-[10px] shrink-0">
                            <div className="flex items-center gap-4 text-gray-400">
                                <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" /> {t('wizard.active_type_filter')}
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-purple-500" /> {t('wizard.active_subject_filter')}
                                </span>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-6 py-2 bg-gray-900 dark:bg-blue-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
                            >
                                {t('wizard.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
