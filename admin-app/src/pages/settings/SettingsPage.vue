<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "vue-toastification";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { platformSettingsService, defaultPlatformSettings } from "@/services/platformSettingsService";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/auth";

const { t } = useI18n();
const toast = useToast();
const authStore = useAuthStore();
const settings = ref(structuredClone(defaultPlatformSettings));
const loading = ref(true);
const saving = ref(false);
const logoUrl = ref("");
const logoUploading = ref(false);
const logoFileInput = ref(null);

async function loadSettings() {
  try {
    loading.value = true;
    settings.value = await platformSettingsService.getAll();

    // Load logo URL separately — stored as a flat JSONB string key
    const { data: logoRow } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "brand_logo_url")
      .maybeSingle();
    if (logoRow?.value) {
      // Supabase already parses JSONB — value is the raw string
      logoUrl.value = typeof logoRow.value === "string" ? logoRow.value : String(logoRow.value);
    }
  } catch (error) {
    toast.error(error.message || "Failed to load platform settings");
  } finally {
    loading.value = false;
  }
}

async function uploadLogo(file) {
  if (file.size > 2 * 1024 * 1024) {
    toast.error("File too large. Max 2MB.");
    return;
  }

  logoUploading.value = true;
  try {
    const ext = file.name.split(".").pop();
    const fileName = `logos/brand-logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("platform-assets")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("platform-assets")
      .getPublicUrl(fileName);

    // Save to platform_settings as JSONB string
    const { error: saveError } = await supabase
      .from("platform_settings")
      .upsert(
        {
          key: "brand_logo_url",
          value: JSON.stringify(publicUrl),
          updated_by: authStore.user?.id || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (saveError) throw saveError;

    logoUrl.value = publicUrl;
    toast.success("Logo uploaded and saved!");
  } catch (error) {
    toast.error(error.message || "Logo upload failed");
  } finally {
    logoUploading.value = false;
    if (logoFileInput.value) logoFileInput.value.value = "";
  }
}

function onFileChange(event) {
  const file = event.target.files?.[0];
  if (file) uploadLogo(file);
}

async function saveSettings() {
  try {
    saving.value = true;
    await Promise.all([
      platformSettingsService.saveSection("brand", settings.value.brand),
      platformSettingsService.saveSection("homepage", settings.value.homepage),
      platformSettingsService.saveSection("auction_rules", settings.value.auction_rules),
      platformSettingsService.saveSection("auth", settings.value.auth),
    ]);
    toast.success("Platform CMS settings saved");
  } catch (error) {
    toast.error(error.message || "Failed to save settings");
  } finally {
    saving.value = false;
  }
}

onMounted(loadSettings);
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p class="font-mono text-xs uppercase tracking-[0.25em] text-blue-700">CMS control center</p>
          <h1 class="text-3xl font-black tracking-tight text-heading">{{ t("admin.settings") }}</h1>
          <p class="text-muted mt-1">Control brand, homepage copy, trust labels, and auction business rules.</p>
        </div>
        <BaseButton :loading="saving" @click="saveSettings">{{ t("common.save") }}</BaseButton>
      </div>

      <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BaseCard v-for="i in 4" :key="i"><div class="h-32 animate-pulse rounded-2xl bg-slate-100" /></BaseCard>
      </div>

      <template v-else>
        <BaseCard>
          <div class="mb-5 flex items-center justify-between">
            <div>
              <h3 class="font-black text-heading text-lg">Brand Identity</h3>
              <p class="text-sm text-muted">These values update the public header, hero, footer, and CTA labels.</p>
            </div>
            <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Public site</span>
          </div>
          <!-- Brand Logo Upload -->
          <div class="mb-5 p-4 rounded-2xl border border-border bg-slate-50">
            <p class="text-sm font-bold text-heading mb-3">Brand Logo</p>
            <div class="flex items-center gap-5 flex-wrap">
              <!-- Preview -->
              <div class="w-32 h-16 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
                <img
                  v-if="logoUrl"
                  :src="logoUrl"
                  alt="Brand logo"
                  class="max-h-full max-w-full object-contain p-1"
                />
                <span v-else class="text-xs text-muted text-center px-2">No logo set</span>
              </div>

              <!-- Upload button -->
              <div class="flex flex-col gap-2">
                <input
                  ref="logoFileInput"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  class="hidden"
                  @change="onFileChange"
                />
                <BaseButton
                  variant="outline"
                  :loading="logoUploading"
                  size="sm"
                  @click="logoFileInput?.click()"
                >
                  <template v-if="!logoUploading">
                    <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload logo
                  </template>
                  <template v-else>Uploading…</template>
                </BaseButton>
                <p class="text-xs text-muted">PNG, JPG, SVG, WebP · Max 2 MB</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BaseInput v-model="settings.brand.name" label="Business Name" />
            <BaseInput v-model="settings.brand.tagline" label="Tagline" />
            <BaseInput v-model="settings.brand.primary_cta" label="Primary CTA" />
            <BaseInput v-model="settings.brand.secondary_cta" label="Secondary CTA" />
            <BaseInput v-model="settings.brand.trust_score" label="Trust Score Label" />
            <BaseInput v-model="settings.brand.review_count" label="Review Count" />
            <BaseInput v-model="settings.brand.review_source" label="Review Source" />
          </div>
        </BaseCard>

        <BaseCard>
          <div class="mb-5">
            <h3 class="font-black text-heading text-lg">Authentication & Security</h3>
            <p class="text-sm text-muted">Control login options displayed by the apps. Supabase provider and MFA enforcement must also be enabled in Supabase Auth settings.</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label class="rounded-2xl border border-border p-4 flex items-start gap-3">
              <input v-model="settings.auth.email_confirm_required" type="checkbox" class="mt-1 h-4 w-4 rounded border-border text-blue-700" />
              <span><strong class="block text-heading">Require email verification</strong><span class="text-sm text-muted">Users should confirm Gmail/email before bidding.</span></span>
            </label>
            <label class="rounded-2xl border border-border p-4 flex items-start gap-3">
              <input v-model="settings.auth.google_login_enabled" type="checkbox" class="mt-1 h-4 w-4 rounded border-border text-blue-700" />
              <span><strong class="block text-heading">Google sign-in button</strong><span class="text-sm text-muted">Show Google login on user and admin apps.</span></span>
            </label>
            <label class="rounded-2xl border border-border p-4 flex items-start gap-3">
              <input v-model="settings.auth.admin_mfa_required" type="checkbox" class="mt-1 h-4 w-4 rounded border-border text-blue-700" />
              <span><strong class="block text-heading">Admin MFA required</strong><span class="text-sm text-muted">Require authenticator app for admin users.</span></span>
            </label>
            <label class="rounded-2xl border border-border p-4 flex items-start gap-3">
              <input v-model="settings.auth.user_mfa_required" type="checkbox" class="mt-1 h-4 w-4 rounded border-border text-blue-700" />
              <span><strong class="block text-heading">User MFA required</strong><span class="text-sm text-muted">Require 2FA for all user accounts.</span></span>
            </label>
            <label class="rounded-2xl border border-border p-4 flex items-start gap-3">
              <input v-model="settings.auth.verified_bidder_mfa_required" type="checkbox" class="mt-1 h-4 w-4 rounded border-border text-blue-700" />
              <span><strong class="block text-heading">Verified bidder MFA</strong><span class="text-sm text-muted">Require 2FA before high-trust bidding.</span></span>
            </label>
          </div>
          <div class="mt-5 rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-900">
            Enable Google in Supabase: Authentication → Providers → Google. Enable MFA in Supabase: Authentication → Settings → Multi-Factor Authentication.
          </div>
        </BaseCard>

        <BaseCard>
          <div class="mb-5">
            <h3 class="font-black text-heading text-lg">Homepage Editorial</h3>
            <p class="text-sm text-muted">Change homepage messaging without redeploying frontend code.</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BaseInput v-model="settings.homepage.hero_eyebrow" label="Hero Eyebrow" />
            <BaseInput v-model="settings.homepage.hero_title" label="Hero Title" />
            <BaseInput v-model="settings.homepage.hero_subtitle" label="Hero Subtitle" />
            <BaseInput v-model="settings.homepage.hero_promo" label="Hero Promo Link" />
            <BaseInput v-model="settings.homepage.featured_title" label="Featured Section Title" />
            <BaseInput v-model="settings.homepage.category_title" label="Category Section Title" />
            <BaseInput v-model="settings.homepage.trust_title" label="Trust Section Title" />
          </div>
        </BaseCard>

        <BaseCard>
          <div class="mb-5">
            <h3 class="font-black text-heading text-lg">Auction & Escrow Rules</h3>
            <p class="text-sm text-muted">Default business logic values used by auction configuration and finance workflows.</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <BaseInput v-model.number="settings.auction_rules.platform_fee" label="Platform Fee (%)" type="number" />
            <BaseInput v-model.number="settings.auction_rules.min_bid_increment" label="Minimum Increment" type="number" />
            <BaseInput v-model.number="settings.auction_rules.max_auction_duration_hours" label="Max Duration (hours)" type="number" />
            <BaseInput v-model.number="settings.auction_rules.auto_extend_minutes" label="Auto Extend (minutes)" type="number" />
            <BaseInput v-model.number="settings.auction_rules.extension_threshold_seconds" label="Extension Threshold (seconds)" type="number" />
            <BaseInput v-model.number="settings.auction_rules.dispute_window_hours" label="Dispute Window (hours)" type="number" />
            <BaseInput v-model.number="settings.auction_rules.escrow_release_hours" label="Escrow Release (hours)" type="number" />
            <BaseInput v-model.number="settings.auction_rules.min_deposit" label="Minimum Deposit" type="number" />
          </div>
        </BaseCard>

        <BaseCard>
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <h3 class="font-black text-heading text-lg">CMS Coverage</h3>
              <p class="text-sm text-muted mt-1">Translations still control all labels. Settings control brand, content, and business defaults.</p>
            </div>
            <router-link to="/admin/cms/translations" class="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">Open translations</router-link>
          </div>
        </BaseCard>
      </template>
    </div>
  </AdminLayout>
</template>
