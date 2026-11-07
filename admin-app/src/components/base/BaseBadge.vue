<script setup>
defineProps({
  variant: { type: String, default: "default", validator: (v) => ["default", "success", "danger", "warning", "info", "purple"].includes(v) },
  size: { type: String, default: "md", validator: (v) => ["sm", "md"].includes(v) },
});

const variants = {
  default: "bg-navy-50 text-muted",
  success: "bg-verdigris/10 text-verdigris",
  danger: "bg-laterite/10 text-laterite",
  warning: "bg-gold-500/15 text-gold-800",
  info: "bg-navy-100/60 text-navy-800",
  purple: "bg-gold-500/15 text-gold-800",
};

const sizes = { sm: "px-2 py-0.5 text-[11px]", md: "px-2.5 py-1 text-xs" };
</script>

<template>
  <span :class="['inline-flex items-center rounded-full font-medium capitalize', variants[variant], sizes[size]]">
    <slot />
  </span>
</template>
