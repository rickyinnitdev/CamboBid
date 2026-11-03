<script setup>
defineProps({
  variant: {
    type: String,
    default: "default",
    validator: (v) =>
      [
        "default",
        "live",
        "draft",
        "pending",
        "approved",
        "rejected",
        "sold",
        "success",
        "danger",
        "warning",
        "info",
        "gold",
      ].includes(v),
  },
  size: { type: String, default: "md" },
  pulse: { type: Boolean, default: false },
});

const variantClasses = {
  default: "bg-slate-100 text-slate-700",
  live: "bg-emerald-50 text-emerald-800",
  draft: "bg-slate-100 text-slate-600",
  pending: "bg-amber-50 text-amber-800",
  approved: "bg-emerald-50 text-emerald-800",
  rejected: "bg-red-50 text-red-800",
  sold: "bg-gold-50 text-gold-800",
  success: "bg-emerald-50 text-emerald-800",
  danger: "bg-red-50 text-red-800",
  warning: "bg-amber-50 text-amber-800",
  info: "bg-navy-50 text-navy-800",
  gold: "bg-gold-50 text-gold-800",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      variantClasses[variant],
      sizeClasses[size],
    ]"
  >
    <span v-if="pulse || variant === 'live'" class="relative flex h-1.5 w-1.5">
      <span
        class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-600 opacity-60"
      />
      <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
    </span>
    <slot />
  </span>
</template>
