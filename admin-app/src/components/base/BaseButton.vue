<script setup>
defineProps({
  variant: { type: String, default: "primary", validator: (v) => ["primary", "secondary", "outline", "danger", "ghost", "success", "warning"].includes(v) },
  size: { type: String, default: "md", validator: (v) => ["sm", "md", "lg"].includes(v) },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: "button" },
});

defineEmits(["click"]);

const variants = {
  primary: "btn-primary",
  secondary: "btn-outline",
  outline: "btn-outline",
  danger: "btn-danger",
  ghost: "btn-ghost",
  success: "btn-success",
  warning: "btn-gold",
};

const sizes = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="['btn', variants[variant], sizes[size]]"
    @click="$emit('click', $event)"
  >
    <svg v-if="loading" class="-ml-1 mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
    <slot />
  </button>
</template>
