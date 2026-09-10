<script setup>
defineProps({
  variant: { type: String, default: "default", validator: (v) => ["default", "success", "danger", "warning", "info", "purple"].includes(v) },
  size: { type: String, default: "md", validator: (v) => ["sm", "md"].includes(v) },
});

const variants = {
  default: "bg-surface text-muted",
  success: "bg-green-100 text-green-800",
  danger: "bg-red-100 text-red-800",
  warning: "bg-yellow-100 text-yellow-800",
  info: "bg-blue-100 text-blue-800",
  purple: "bg-purple-100 text-purple-800",
};

const sizes = { sm: "px-2 py-0.5 text-xs", md: "px-2.5 py-1 text-xs" };
</script>

<template>
  <span :class="['inline-flex items-center font-medium rounded-full', variants[variant], sizes[size]]">
    <slot />
  </span>
</template>
