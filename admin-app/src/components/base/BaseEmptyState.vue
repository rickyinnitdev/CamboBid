<script setup>
defineProps({
  title: { type: String, default: "No data" },
  description: { type: String, default: "" },
  icon: { type: String, default: "" },
});
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div class="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
      <svg v-if="!icon" class="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <slot v-else name="icon" />
    </div>
    <h3 class="text-sm font-medium text-heading mb-1">{{ title }}</h3>
    <p v-if="description" class="text-xs text-muted max-w-xs">{{ description }}</p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>
