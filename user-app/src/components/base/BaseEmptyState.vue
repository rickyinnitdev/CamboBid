<script setup>
defineProps({
  title: { type: String, default: "No data found" },
  description: { type: String, default: "" },
  icon: { type: String, default: "inbox" },
});

defineEmits(["action"]);

const icons = {
  inbox: "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  auction: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <div class="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
      <svg class="w-8 h-8 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="icons[icon] || icons.inbox" />
      </svg>
    </div>
    <h3 class="text-lg font-medium text-heading mb-1">{{ title }}</h3>
    <p v-if="description" class="text-sm text-muted max-w-sm">{{ description }}</p>
    <slot name="action" />
  </div>
</template>
