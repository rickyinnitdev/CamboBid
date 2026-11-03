<script setup>
import { computed } from "vue";
import { getAuctionState } from "@/utils/auctionPresentation";

const props = defineProps({
  auction: { type: Object, default: null },
  state: { type: Object, default: null },
  size: { type: String, default: "md" },
});

const resolved = computed(() => props.state || getAuctionState(props.auction));
const sizeClass = computed(() =>
  props.size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
);
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      resolved.tone,
      sizeClass,
    ]"
  >
    <span
      v-if="resolved.key === 'live' || resolved.key === 'ending_soon'"
      class="relative flex h-1.5 w-1.5"
    >
      <span
        v-if="resolved.key === 'live'"
        class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-600 opacity-60"
      />
      <span
        :class="['relative inline-flex h-1.5 w-1.5 rounded-full', resolved.dot]"
      />
    </span>
    {{ resolved.label }}
  </span>
</template>
