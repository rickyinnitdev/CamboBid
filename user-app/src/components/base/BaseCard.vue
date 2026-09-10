<script setup>
defineProps({
  hover: { type: Boolean, default: false },
});
</script>

<template>
  <div
    :class="[
      'bg-white rounded-xl shadow-sm border border-border',
      hover && 'hover:shadow-md transition-shadow duration-200 cursor-pointer',
    ]"
  >
    <slot />
  </div>
</template>
