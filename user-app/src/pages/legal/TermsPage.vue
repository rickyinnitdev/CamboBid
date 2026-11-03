<script setup>
import { computed, onMounted, ref } from "vue";
import UserLayout from "@/components/layout/UserLayout.vue";
import { platformSettingsService } from "@/services/platformSettingsService";

const settings = ref(platformSettingsService.getCached().terms);
const loading = ref(!settings.value?.content);
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
      <div class="page-header">
        <div>
          <p class="kicker">Legal</p>
          <h1 class="page-title mt-3">{{ settings.title }}</h1>
          <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span v-if="settings.version">Version {{ settings.version }}</span>
            <span v-if="settings.effective_date">Effective {{ settings.effective_date }}</span>
          </div>
        </div>
        <router-link to="/" class="btn-outline btn-sm self-start sm:self-auto">
          Back to CamboBid
        </router-link>
      </div>

      <div v-if="loading" class="surface-panel space-y-3 p-6 sm:p-10">
        <div class="h-5 w-48 animate-pulse rounded bg-slate-200/70" />
        <div class="space-y-3 pt-3">
          <div v-for="i in 6" :key="i" class="h-4 animate-pulse rounded bg-slate-200/70" />
        </div>
      </div>

      <div
        v-else-if="error"
        role="alert"
        class="rounded-xl border border-danger/20 bg-danger/5 p-5 text-sm text-danger"
      >
        {{ error }}
      </div>

      <article v-else class="surface-panel p-6 sm:p-10">
        <div
          v-if="isDraft"
          class="mb-8 rounded-xl border border-gold-200 bg-gold-50 p-4 text-sm leading-6 text-gold-900"
        >
          This document is currently a draft. The final approved Terms &
          Conditions must be published before production use.
        </div>
        <div class="space-y-5 text-[15px] leading-8 text-body">
          <p v-for="(paragraph, index) in paragraphs" :key="index" class="whitespace-pre-line">
            {{ paragraph }}
          </p>
        </div>
        <p v-if="settings.contact_email" class="mt-8 border-t border-border pt-6 text-sm text-body">
          Questions about these terms?
          <a
            :href="`mailto:${settings.contact_email}`"
            class="font-semibold text-navy-700 hover:text-navy-900"
          >
            {{ settings.contact_email }}
          </a>
        </p>
      </article>
    </main>
  </UserLayout>
</template>
