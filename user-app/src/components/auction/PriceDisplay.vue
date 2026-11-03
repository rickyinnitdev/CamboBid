<script setup>
import { computed } from "vue";
import { formatUSD } from "@/utils/format";

const props = defineProps({
  amount: { type: [Number, String], default: 0 },
  label: { type: String, default: "" },
  size: {
    type: String,
    default: "md",
    validator: (v) => ["sm", "md", "lg", "xl"].includes(v),
  },
  tone: {
    type: String,
    default: "default",
    validator: (v) => ["default", "muted", "gold"].includes(v),
  },
});

const sizeClasses = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
  xl: "text-4xl sm:text-[2.75rem]",
};

const toneClasses = {
  default: "text-heading",
  muted: "text-slate-600",
  gold: "text-gold-700",
};

const value = computed(() => formatUSD(props.amount));
</script>

<template>
  <div>
    <p v-if="label" class="meta-label">{{ label }}</p>
    <p
      :class="[
        'numeric font-semibold leading-none tracking-[-0.02em]',
        sizeClasses[size],
        toneClasses[tone],
      ]"
    >
      {{ value }}
    </p>
  </div>
</template>
