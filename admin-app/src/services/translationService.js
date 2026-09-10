import { supabase } from "./supabase";

export const translationService = {
  async getTranslations(locale, prefix) {
    let query = supabase
      .from("cms_translations")
      .select("id, locale, key, value, updated_at, updated_by, editor:profiles!cms_translations_updated_by_fkey(display_name)")
      .eq("locale", locale);

    if (prefix) {
      query = query.ilike("key", `${prefix}%`);
    }

    query = query.order("key");

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async updateTranslation(id, value, updatedBy) {
    const { data, error } = await supabase
      .from("cms_translations")
      .update({
        value,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addTranslation(locale, key, value) {
    const { data, error } = await supabase
      .from("cms_translations")
      .insert({ locale, key, value })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTranslation(id) {
    const { error } = await supabase
      .from("cms_translations")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async getLocales() {
    const { data, error } = await supabase
      .from("cms_translations")
      .select("locale");

    if (error) throw error;
    return [...new Set(data.map((t) => t.locale))];
  },

  async addLocale(locale, baseLocale = "en") {
    const { data: baseTranslations } = await supabase
      .from("cms_translations")
      .select("key, value")
      .eq("locale", baseLocale);

    if (baseTranslations && baseTranslations.length > 0) {
      const newTranslations = baseTranslations.map((t) => ({
        locale,
        key: t.key,
        value: "",
      }));

      const { error } = await supabase
        .from("cms_translations")
        .insert(newTranslations);

      if (error) throw error;
    }

    return true;
  },

  async exportLocale(locale) {
    const { data, error } = await supabase
      .from("cms_translations")
      .select("key, value")
      .eq("locale", locale)
      .order("key");

    if (error) throw error;

    const translations = {};
    for (const item of data) {
      const keys = item.key.split(".");
      let current = translations;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = item.value;
    }

    return JSON.stringify(translations, null, 2);
  },

  async importLocale(locale, jsonData) {
    const flat = {};
    const flatten = (obj, prefix = "") => {
      for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === "object" && obj[key] !== null) {
          flatten(obj[key], fullKey);
        } else {
          flat[fullKey] = String(obj[key]);
        }
      }
    };
    flatten(jsonData);

    const translations = Object.entries(flat).map(([key, value]) => ({
      locale,
      key,
      value,
    }));

    if (translations.length > 0) {
      const { error } = await supabase
        .from("cms_translations")
        .upsert(translations, { onConflict: "locale,key" });

      if (error) throw error;
    }

    return translations.length;
  },
};

export default translationService;
