<script setup>
defineProps({
  padding: { type: String, default: "md", validator: (v) => ["none", "sm", "md", "lg"].includes(v) },
});

const paddings = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };
</script>

<template>
  <div :class="['rounded-xl border border-border bg-card', paddings[padding]]">
    <slot />
  </div>
</template>
