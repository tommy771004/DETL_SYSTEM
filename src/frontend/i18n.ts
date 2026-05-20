import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import locales
import enCommon from './locales/en/common.json';
import zhCommon from './locales/zh-TW/common.json';

const resources = {
  en: { common: enCommon },
  'zh-TW': { common: zhCommon },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-TW', // Default to zh-TW as per typical Trinity deployments in Taiwan
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      lookupLocalStorage: 'dsystem-lang',
      caches: ['localStorage'],
    }
  });

export default i18n;
