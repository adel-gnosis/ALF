'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSelectLanguage, useMe } from '@alf/shared';
import { useQueryClient } from '@tanstack/react-query';

// Import our translation files
import en from '../messages/en.json';
import fr from '../messages/fr.json';
import ar from '../messages/ar.json';

type Locale = 'en' | 'fr' | 'ar';
type Messages = typeof en;

interface I18nContextType {
    locale: Locale;
    t: (key: string) => string;
    setLocale: (locale: Locale) => void;
    isRTL: boolean;
}

// Helper to get messages considering potential default export wrapping
const getMessages = (m: any) => m.default || m;
const messages: Record<Locale, any> = {
    en: getMessages(en),
    fr: getMessages(fr),
    ar: getMessages(ar)
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const { data: user } = useMe();
    const selectLangMutation = useSelectLanguage();
    const queryClient = useQueryClient();

    // Default to 'fr' or user's preferred language
    const [locale, setLocaleState] = useState<Locale>('fr');

    useEffect(() => {
        if (user?.native_language && (user.native_language === 'fr' || user.native_language === 'en' || user.native_language === 'ar')) {
            setLocaleState(user.native_language as Locale);
        }
    }, [user?.native_language]);

    const setLocale = useCallback(async (newLocale: Locale) => {
        setLocaleState(newLocale);
        try {
            await selectLangMutation.mutateAsync(newLocale);
            // Invalidate queries that depend on i18n translations
            // This ensures activity instruction/question texts are refetched in the new language
            queryClient.invalidateQueries({ queryKey: ['teacher-activities'] });
            queryClient.invalidateQueries({ queryKey: ['teacher-browse-activities'] });
            queryClient.invalidateQueries({ queryKey: ['admin-activities'] });
        } catch (error) {
            console.error('Failed to sync language to backend:', error);
        }
    }, [selectLangMutation, queryClient]);

    // Handle RTL
    const isRTL = locale === 'ar';
    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
            document.documentElement.lang = locale;
        }
    }, [locale, isRTL]);

    const t = useCallback((path: string): string => {
        const keys = path.split('.');
        const localeMessages = messages[locale] || messages['fr'];
        let current = localeMessages;

        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return path; // Fallback to key
            }
        }

        return typeof current === 'string' ? current : path;
    }, [locale]);

    return (
        <I18nContext.Provider value={{ locale, t, setLocale, isRTL }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}
