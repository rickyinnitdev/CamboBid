<script setup>
import { computed } from "vue";

const props = defineProps({
  color: { type: String, default: "#C08A2E" },
  opacity: { type: Number, default: 0.06 },
  scale: { type: Number, default: 104 },
  variant: { type: String, default: "floral" },
  strokeWidth: { type: Number, default: 1.1 },
});

const patternId = `pkar-${Math.random().toString(36).slice(2, 9)}`;
const isTemple = computed(() => props.variant === "temple");
</script>

<template>
  <div
    class="pointer-events-none absolute inset-0 overflow-hidden"
    :style="{ opacity }"
    aria-hidden="true"
  >
    <svg class="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern
          :id="patternId"
          :width="scale"
          :height="scale"
          patternUnits="userSpaceOnUse"
          viewBox="0 0 96 96"
        >
          <!-- Khmer temple-inspired geometric lattice: nested diamonds,
               stepped corner rays and a central lotus bud. -->
          <g
            v-if="isTemple"
            fill="none"
            :stroke="color"
            :stroke-width="strokeWidth"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M48 8 88 48 48 88 8 48Z" />
            <path d="M48 22 74 48 48 74 22 48Z" />
            <path d="M48 36 60 48 48 60 36 48Z" />
            <path d="M48 8v14M48 74v14M8 48h14M74 48h14" />
            <path d="M30 30l8 8M58 58l8 8M66 30l-8 8M38 58l-8 8" />
            <path d="M48 41c2.8 3.8 2.8 7.8 0 11.6-2.8-3.8-2.8-7.8 0-11.6Z" />
            <path d="M24 48c4-3 8-3 12 0-4 3-8 3-12 0Z" />
            <path d="M60 48c4-3 8-3 12 0-4 3-8 3-12 0Z" />
          </g>

          <!-- Pkar Champey: layered petals, inner diamond and curling leaves. -->
          <g
            v-else
            fill="none"
            :stroke="color"
            :stroke-width="strokeWidth"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M48 16c6.5 9 6.5 18.5 0 27.5C41.5 34.5 41.5 25 48 16Z" />
            <path d="M48 43.5c-9-6-18-6-27 0 9 6 18 6 27 0Z" />
            <path d="M48 43.5c9-6 18-6 27 0-9 6-18 6-27 0Z" />
            <path d="M48 43.5c-3.5 9-3.5 17 0 25 3.5-8 3.5-16 0-25Z" />
            <path d="M48 39l7 7-7 7-7-7Z" />
            <path d="M20 44c-3.5 4-3.5 8.5 0 12.5M76 44c3.5 4 3.5 8.5 0 12.5" />
            <path d="M31 72c4-3 8-3 12 0M65 72c-4-3-8-3-12 0" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" :fill="`url(#${patternId})`" />
    </svg>
  </div>
</template>
