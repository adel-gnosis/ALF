import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import 'intl-pluralrules';
import storage from '../services/storage';

import en from './resources/en.json';
import fr from './resources/fr.json';
import ar from './resources/ar.json';

const resources = {
    en: { translation: en },
    fr: { translation: fr },
    ar: { translation: ar },
};

const LANGUAGE_KEY = 'user-language';

const initI18n = async () => {
    // 1. Try to get saved language
    let savedLanguage = await storage.getItem(LANGUAGE_KEY);

    // 2. Fallback to device locale
    let locale = savedLanguage || Localization.getLocales()[0]?.languageCode || 'fr';

    // Use the detected language or fallback
    await i18n
        .use(initReactI18next)
        .init({
            resources,
            lng: locale,
            fallbackLng: 'fr',
            interpolation: {
                escapeValue: false,
            },
            react: {
                useSuspense: false
            }
        });
};

initI18n();

export const changeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
    await storage.setItem(LANGUAGE_KEY, lng);
};

export default i18n;

