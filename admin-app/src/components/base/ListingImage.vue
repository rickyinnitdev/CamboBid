<script setup>
import { computed, ref, watch } from "vue";
const props = defineProps({
  image: [String, Object],
  alt: { type: String, default: "Listing image" },
});
const failed = ref(false);
const source = computed(() => {
  const value =
    typeof props.image === "string" ? props.image : props.image?.url;
  return typeof value === "string" ? value : "";
});
watch(source, () => {
  failed.value = false;
});
</script>
<template>
  <span class="block overflow-hidden rounded-lg bg-slate-100">
    <img
      v-if="source && !failed"
      :src="source"
      :alt="alt"
      class="w-full h-full object-cover"
      @error="failed = true"
    />
    <span
      v-else
      role="img"
      :aria-label="alt + ' unavailable'"
      class="grid h-full w-full place-items-center text-slate-400"
    >
      <svg
        class="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M4 16l4-4 4 4 3-3 5 5M8 8h.01M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
        />
      </svg>
    </span>
  </span>
</template>
