import { type AppLanguage, defaultNS, resources } from "@/i18n/resources";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const STORAGE_KEY = "music-collector-language";

export function storedLanguage(): AppLanguage {
  const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
  return stored !== null && stored in resources ? (stored as AppLanguage) : "en";
}

export function persistLanguage(language: AppLanguage): void {
  globalThis.localStorage?.setItem(STORAGE_KEY, language);
}

void i18n.use(initReactI18next).init({
  resources,
  defaultNS,
  lng: storedLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
