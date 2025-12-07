import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import es from '../locales/es.json';
import hi from '../locales/hi.json';

const LANGUAGE_KEY = '@CampusConnect:language';

// Get saved language or device language
const getInitialLanguage = async (): Promise<string> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && ['en', 'hi', 'es'].includes(savedLanguage)) {
      return savedLanguage;
    }
    
    // Get device locale
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const deviceLocale = locales[0].languageCode || locales[0].languageTag?.split('-')[0] || 'en';
      if (['en', 'hi', 'es'].includes(deviceLocale)) {
        return deviceLocale;
      }
    }
    
    return 'en'; // Default to English
  } catch (error) {
    console.error('Error getting initial language:', error);
    return 'en';
  }
};

// Initialize i18n
const initI18n = async () => {
  const initialLanguage = await getInitialLanguage();
  
  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v4',
      resources: {
        en: { translation: en },
        hi: { translation: hi },
        es: { translation: es },
      },
      lng: initialLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });
};

// Change language and save to storage
export const changeLanguage = async (language: string) => {
  try {
    if (['en', 'hi', 'es'].includes(language)) {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
      await i18n.changeLanguage(language);
    }
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'en';
};

// Initialize i18n immediately (synchronous initialization)
initI18n();

export default i18n;

