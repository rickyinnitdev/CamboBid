<script setup>
defineProps({
  hover: { type: Boolean, default: false },
  padded: { type: Boolean, default: false },
});
</script>

<template>
  <div
    :class="[
      'rounded-2xl border border-border bg-card shadow-sm',
      hover &&
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-md',
      padded && 'p-5 sm:p-6',
    ]"
  >
    <slot />
  </div>
</template>
