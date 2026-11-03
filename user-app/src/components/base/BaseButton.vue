<script setup>
defineProps({
  variant: {
    type: String,
    default: "primary",
    validator: (v) =>
      ["primary", "gold", "danger", "success", "outline", "ghost"].includes(v),
  },
  size: {
    type: String,
    default: "md",
    validator: (v) => ["sm", "md", "lg"].includes(v),
  },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  type: { type: String, default: "button" },
});

defineEmits(["click"]);

const variantClasses = {
  primary: "bg-navy-900 text-white hover:bg-navy-700 focus-visible:ring-navy-500",
  gold: "bg-gold-500 text-navy-900 hover:bg-gold-400 focus-visible:ring-gold-500",
  danger: "bg-danger text-white hover:bg-red-800 focus-visible:ring-red-500",
  success:
    "bg-success text-white hover:bg-emerald-800 focus-visible:ring-emerald-600",
  outline:
    "border border-line bg-white text-heading hover:border-navy-300 hover:bg-surface focus-visible:ring-navy-500",
  ghost:
    "bg-transparent text-body hover:bg-surface hover:text-heading focus-visible:ring-navy-500",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-[15px]",
};
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      variantClasses[variant],
      sizeClasses[size],
    ]"
    @click="$emit('click', $event)"
  >
    <svg
      v-if="loading"
      class="-ml-1 h-4 w-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
    <slot />
  </button>
</template>
