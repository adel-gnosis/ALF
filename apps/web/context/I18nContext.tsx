'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { userApi } from '@alf/shared';

// Import our translation files
import en from '../messages/en.json';
import fr from '../messages/fr.json';
import ar from '../messages/ar.json';

type Locale = 'en' | 'fr' | 'ar';

interface I18nContextType {
    locale: Locale;
    t: (key: string) => string;
    setLocale: (locale: Locale) => void;
    isRTL: boolean;
}

const getMessages = (m: any) => m.default || m;
const messages: Record<Locale, any> = {
    en: getMessages(en),
    fr: getMessages(fr),
    ar: getMessages(ar),
};

const STORAGE_KEY = 'alf_locale';

function getSavedLocale(): Locale {
    if (typeof window === 'undefined') return 'fr';
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && ['en', 'fr', 'ar'].includes(saved)) return saved;
    return 'fr';
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();
    const [locale, setLocaleState] = useState<Locale>('fr');

    // Hydrate from localStorage on mount
    useEffect(() => {
        const saved = getSavedLocale();
        setLocaleState(saved);

        // On first visit (no saved preference), try to use the user's profile language.
        // We read from the React Query cache — no hook needed, no auth required.
        if (!localStorage.getItem(STORAGE_KEY)) {
            const cached: any = queryClient.getQueryData(['me']);
            const lang = cached?.native_language;
            if (lang && ['en', 'fr', 'ar'].includes(lang)) {
                setLocaleState(lang as Locale);
                localStorage.setItem(STORAGE_KEY, lang);
            }
        }
    }, [queryClient]);

    const setLocale = useCallback(
        async (newLocale: Locale) => {
            // 1. Update UI immediately
            setLocaleState(newLocale);

            // 2. Persist so every page (public + dashboard) remembers the choice
            localStorage.setItem(STORAGE_KEY, newLocale);

            // 3. Sync to backend only when logged in.
            //    userApi.selectLanguage uses the shared axios instance which already
            //    has the auth token injected via setTokenProvider in providers.tsx.
            //    If there is no token (public page / unauthenticated), the request
            //    will be rejected and we catch it silently — UI is already updated.
            const token = localStorage.getItem('alf_access_token');
            if (!token) return;

            try {
                await userApi.selectLanguage(newLocale);
                // Invalidate queries that serve translated content
                queryClient.invalidateQueries({ queryKey: ['teacher-activities'] });
                queryClient.invalidateQueries({ queryKey: ['teacher-browse-activities'] });
                queryClient.invalidateQueries({ queryKey: ['admin-activities'] });
            } catch {
                // Backend sync failed (network error, session expired, etc.) — ignored.
                // The UI language is already updated and persisted to localStorage.
            }
        },
        [queryClient]
    );

    // Keep <html> dir and lang attributes in sync
    const isRTL = locale === 'ar';
    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = locale;
    }, [locale, isRTL]);

    const t = useCallback(
        (path: string): string => {
            const keys = path.split('.');
            const localeMessages = messages[locale] || messages['fr'];
            let current = localeMessages;
            for (const key of keys) {
                if (current && typeof current === 'object' && key in current) {
                    current = current[key];
                } else {
                    return path; // fallback to key
                }
            }
            return typeof current === 'string' ? current : path;
        },
        [locale]
    );

    return (
        <I18nContext.Provider value={{ locale, t, setLocale, isRTL }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) throw new Error('useI18n must be used within an I18nProvider');
    return context;
}