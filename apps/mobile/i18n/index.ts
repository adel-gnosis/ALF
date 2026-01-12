import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import 'intl-pluralrules';

import en from './resources/en.json';
import fr from './resources/fr.json';
import ar from './resources/ar.json';

const resources = {
    en: { translation: en },
    fr: { translation: fr },
    ar: { translation: ar },
};

const initI18n = async () => {
    let locale = Localization.getLocales()[0].languageCode;

    // Fallback to fr if null or undefined
    if (!locale) {
        locale = 'fr';
    }

    // Use the detected language or fallback
    await i18n
        .use(initReactI18next)
        .init({
            resources,
            lng: locale, // Use detected locale
            fallbackLng: 'fr', // Default if language not found
            interpolation: {
                escapeValue: false,
            },
            react: {
                useSuspense: false // React Native doesn't support Suspense yet for this
            }
        });
};

initI18n();

export default i18n;
