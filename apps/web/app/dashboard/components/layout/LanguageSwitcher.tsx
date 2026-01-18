'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../../../context/I18nContext';
import { Languages, Check } from 'lucide-react';

const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export default function LanguageSwitcher() {
    const { locale, setLocale, isRTL } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentLang = languages.find(l => l.code === locale) || languages[0];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-9 items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-sm font-medium text-foreground hover:bg-muted transition-all"
                title="Change language"
            >
                <Languages className="h-4 w-4" />
                <span className="hidden sm:inline">{currentLang.label}</span>
                <span className="sm:hidden">{currentLang.flag}</span>
            </button>

            {isOpen && (
                <div className={`
                    absolute top-full mt-2 w-48 rounded-xl border border-border bg-background/90 p-1 shadow-xl glass z-50
                    ${isRTL ? 'left-0' : 'right-0'}
                `}>
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                setLocale(lang.code as any);
                                setIsOpen(false);
                            }}
                            className={`
                                flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors
                                ${locale === lang.code
                                    ? 'bg-primary/10 text-primary font-semibold'
                                    : 'text-foreground hover:bg-muted'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">{lang.flag}</span>
                                <span>{lang.label}</span>
                            </div>
                            {locale === lang.code && <Check className="h-4 w-4" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
