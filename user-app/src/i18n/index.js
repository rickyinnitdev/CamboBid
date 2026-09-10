import { createI18n } from "vue-i18n";
import en from "@/locales/en.json";

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem("locale") || "en",
  fallbackLocale: "en",
  messages: {
    en,
  },
  missing: (locale, key) => {
    if (import.meta.env.DEV) {
      console.warn(`Missing translation: ${locale}.${key}`);
    }
    return key;
  },
});

export default i18n;
