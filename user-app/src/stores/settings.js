import { defineStore } from "pinia";
import { ref } from "vue";
import { platformSettingsService, defaultPlatformSettings } from "@/services/platformSettingsService";

export const useSettingsStore = defineStore("settings", () => {
  const settings = ref(platformSettingsService.getCached());
  const logoUrl = ref(settings.value.brand_logo_url || "");
  const fetched = ref(false);

  async function fetchSettings() {
    try {
      const fresh = await platformSettingsService.getAll();
      settings.value = fresh;

      // brand_logo_url is a flat string on the settings object.
      // Strip any residual JSON-encoded outer quotes just in case.
      let raw = fresh.brand_logo_url ?? "";
      if (typeof raw === "string") {
        raw = raw.replace(/^"|"$/g, "");
      }
      logoUrl.value = raw;
      fetched.value = true;
    } catch {
      // Keep cached values on error
    }
  }

  // Also react to settings updated by admin CMS (same-tab updates)
  if (typeof window !== "undefined") {
    window.addEventListener("platform-settings-updated", (e) => {
      const updated = e.detail;
      if (updated) {
        settings.value = updated;
        let raw = updated.brand_logo_url ?? "";
        if (typeof raw === "string") raw = raw.replace(/^"|"$/g, "");
        logoUrl.value = raw;
      }
    });
  }

  return { settings, logoUrl, fetched, fetchSettings };
});
