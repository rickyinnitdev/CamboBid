<script setup>
defineProps({
  title: { type: String, default: "Nothing here yet" },
  description: { type: String, default: "" },
  icon: { type: String, default: "inbox" },
});

const icons = {
  inbox:
    "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  auction:
    "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  heart:
    "M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z",
  package:
    "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
};
</script>

<template>
  <div
    class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white/70 px-6 py-14 text-center"
  >
    <div class="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-navy-50">
      <svg
        class="h-7 w-7 text-navy-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          :d="icons[icon] || icons.inbox"
        />
      </svg>
    </div>
    <h3 class="font-display text-lg font-semibold text-heading">{{ title }}</h3>
    <p v-if="description" class="mt-1.5 max-w-sm text-sm leading-6 text-body">
      {{ description }}
    </p>
    <slot name="action" />
  </div>
</template>
