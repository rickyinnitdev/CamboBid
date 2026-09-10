<script setup>
defineProps({
  variant: {
    type: String,
    default: "default",
    validator: (v) => ["default", "live", "draft", "pending", "approved", "rejected", "sold", "success", "danger", "warning", "info", "gold"].includes(v),
  },
  size: { type: String, default: "md" },
  pulse: { type: Boolean, default: false },
});

const variantClasses = {
  default: "bg-muted/20 text-muted",
  live: "bg-success/10 text-success",
  draft: "bg-muted/20 text-muted",
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-danger/10 text-danger",
  sold: "bg-gold-500/10 text-gold-700",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
  info: "bg-navy-700/10 text-navy-700",
  gold: "bg-gold-500/10 text-gold-700",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-full font-medium',
      variantClasses[variant],
      sizeClasses[size],
    ]"
  >
    <span
      v-if="pulse || variant === 'live'"
      class="relative flex h-2 w-2"
    >
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
      <span class="relative inline-flex rounded-full h-2 w-2 bg-success" />
    </span>
    <slot />
  </span>
</template>
