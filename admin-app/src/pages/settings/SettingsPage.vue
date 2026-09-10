<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "vue-toastification";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { platformSettingsService, defaultPlatformSettings } from "@/services/platformSettingsService";

const { t } = useI18n();
const toast = useToast();
const settings = ref(structuredClone(defaultPlatformSettings));
const loading = ref(true);
const saving = ref(false);

async function loadSettings() {
  try {
    loading.value = true;
    settings.value = await platformSettingsService.getAll();
  } catch (error) {
    toast.error(error.message || "Failed to load platform settings");
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  try {
    saving.value = true;
    await Promise.all([
      platformSettingsService.saveSection("brand", settings.value.brand),
      platformSettingsService.saveSection("homepage", settings.value.homepage),
      platformSettingsService.saveSection("auction_rules", settings.value.auction_rules),
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
