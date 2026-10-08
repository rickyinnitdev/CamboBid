<script setup>
import { computed, onMounted, ref } from "vue";
import UserLayout from "@/components/layout/UserLayout.vue";
import { platformSettingsService } from "@/services/platformSettingsService";

const settings = ref(platformSettingsService.getCached().terms);
const loading = ref(true);
const error = ref("");

const paragraphs = computed(() =>
  String(settings.value?.content || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
);

const isDraft = computed(() => !settings.value?.published || String(settings.value?.version || "").startsWith("draft"));

async function loadTerms() {
  try {
    const allSettings = await platformSettingsService.getAll();
    settings.value = allSettings.terms;
  } catch (loadError) {
    error.value = loadError.message || "Unable to load the Terms & Conditions.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadTerms);
</script>

<template>
  <UserLayout>
    <main class="page-container max-w-4xl">
      <div class="mb-8">
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Legal</p>
        <h1 class="mt-2 text-3xl sm:text-4xl font-black text-slate-950">{{ settings.title }}</h1>
        <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          <span v-if="settings.version">Version {{ settings.version }}</span>
          <span v-if="settings.effective_date">Effective {{ settings.effective_date }}</span>
        </div>
      </div>

      <div v-if="loading" class="rounded-3xl bg-white border border-slate-200 p-8 animate-pulse">
        <div class="h-5 w-48 rounded bg-slate-200 mb-6" />
        <div class="space-y-3">
          <div v-for="i in 6" :key="i" class="h-4 rounded bg-slate-100" />
        </div>
      </div>

      <div v-else-if="error" class="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        {{ error }}
      </div>

      <article v-else class="rounded-3xl bg-white border border-slate-200 p-6 sm:p-10 shadow-sm">
        <div v-if="isDraft" class="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This document is currently a draft. The final approved Terms & Conditions must be published before production use.
        </div>
        <div class="space-y-6 text-[15px] leading-7 text-slate-700">
          <p v-for="(paragraph, index) in paragraphs" :key="index" class="whitespace-pre-line">
            {{ paragraph }}
          </p>
        </div>
        <p v-if="settings.contact_email" class="mt-8 border-t border-slate-100 pt-6 text-sm text-slate-500">
          Questions about these terms?
          <a :href="`mailto:${settings.contact_email}`" class="font-semibold text-blue-700 hover:text-blue-800">
            {{ settings.contact_email }}
          </a>
        </p>
      </article>
    </main>
  </UserLayout>
</template>
