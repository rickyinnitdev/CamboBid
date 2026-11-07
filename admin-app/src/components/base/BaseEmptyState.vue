<script setup>
import KhmerMark from "@/components/base/KhmerMark.vue";

defineProps({
  title: { type: String, default: "No data" },
  description: { type: String, default: "" },
  icon: { type: String, default: "" },
});
</script>

<template>
  <div class="flex flex-col items-center justify-center px-4 py-14 text-center">
    <div class="mb-4 grid h-14 w-14 place-items-center rounded-full border border-border bg-paper">
      <slot v-if="icon" name="icon" />
      <KhmerMark
        v-else
        variant="temple"
        color="#C08A2E"
        :opacity="0.65"
        :stroke-width="1.1"
        class="h-8 w-8"
      />
    </div>
    <h3 class="mb-1 text-sm font-medium text-heading">{{ title }}</h3>
    <p v-if="description" class="max-w-xs text-xs leading-5 text-muted">{{ description }}</p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>
