import { supabase } from "./supabase";

// Default translations (fallback)
import enLocale from "@/locales/en.json";

let cachedOverrides = {};
let currentLocale = "en";

export const translationService = {
  async loadOverrides(locale) {
    try {
      const { data, error } = await supabase
        .from("cms_translations")
        .select("key, value")
        .eq("locale", locale);

      if (error) throw error;

      const overrides = {};
      for (const item of data) {
        const keys = item.key.split(".");
        let current = overrides;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = item.value;
      }

      cachedOverrides[locale] = overrides;
      return overrides;
    } catch (error) {
      console.error("Error loading translation overrides:", error);
      return {};
    }
  },

  async getTranslations(locale) {
    // Load base translations
    let baseTranslations;
    try {
      baseTranslations = (await import(`@/locales/${locale}.json`)).default;
    } catch {
      baseTranslations = enLocale;
    }

    // Load overrides from DB if not cached
    if (!cachedOverrides[locale]) {
      await this.loadOverrides(locale);
    }

    // Deep merge overrides over base
    return this.deepMerge(baseTranslations, cachedOverrides[locale] || {});
  },

  async updateTranslation(locale, key, value) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("cms_translations")
      .upsert({
        locale,
        key,
        value,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "locale,key" })
      .select()
      .single();

    if (error) throw error;

    // Update cache
    if (!cachedOverrides[locale]) cachedOverrides[locale] = {};
    const keys = key.split(".");
    let current = cachedOverrides[locale];
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    return data;
  },

  async addLocale(locale, baseLocale = "en") {
    // Get all keys from base locale
    const baseKeys = this.getFlattenedKeys(
      cachedOverrides[baseLocale] || enLocale
    );

    // Create empty translations for new locale
    const translations = [];
    for (const key of baseKeys) {
      translations.push({
        locale,
        key,
        value: "",
        updated_at: new Date().toISOString(),
      });
    }

    if (translations.length > 0) {
      const { error } = await supabase
        .from("cms_translations")
        .insert(translations);

      if (error) throw error;
    }

    // Clear cache for new locale
    delete cachedOverrides[locale];

    return translations.length;
  },

  async exportLocale(locale) {
    const translations = await this.getTranslations(locale);
    return JSON.stringify(translations, null, 2);
  },

  async importLocale(locale, jsonTranslations) {
    const flat = this.flattenObject(jsonTranslations);
    const translations = [];

    for (const [key, value] of Object.entries(flat)) {
      translations.push({
        locale,
        key,
        value: String(value),
        updated_at: new Date().toISOString(),
      });
    }

    if (translations.length > 0) {
      const { error } = await supabase
        .from("cms_translations")
        .upsert(translations, { onConflict: "locale,key" });

      if (error) throw error;
    }

    delete cachedOverrides[locale];
    return translations.length;
  },

  deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  },

  flattenObject(obj, prefix = "") {
    const result = {};
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        Object.assign(result, this.flattenObject(obj[key], fullKey));
      } else {
        result[fullKey] = obj[key];
      }
    }
    return result;
  },

  getFlattenedKeys(obj, prefix = "") {
    const keys = [];
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        keys.push(...this.getFlattenedKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  },

  setCachedOverrides(locale, overrides) {
    cachedOverrides[locale] = overrides;
  },

  getCachedOverrides(locale) {
    return cachedOverrides[locale] || {};
  },
};

export default translationService;
