<script setup>
defineProps({
  hover: { type: Boolean, default: false },
});
</script>

<template>
  <div
    :class="[
      'bg-white rounded-2xl shadow-sm border border-border/80',
      hover && 'hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer',
    ]"
  >
    <slot />
  </div>
</template>
