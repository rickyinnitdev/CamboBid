<script setup>
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import BaseButton from "@/components/base/BaseButton.vue";

const { t } = useI18n();
const router = useRouter();
</script>

<template>
  <div class="min-h-screen bg-surface flex items-center justify-center p-4">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-navy-300 mb-4">404</h1>
      <p class="text-xl text-heading mb-2">{{ t("errors.not_found") }}</p>
      <p class="text-muted mb-6">The page you're looking for doesn't exist.</p>
      <BaseButton @click="router.push('/admin')">
        {{ t("common.back") }} to Dashboard
      </BaseButton>
    </div>
  </div>
</template>
