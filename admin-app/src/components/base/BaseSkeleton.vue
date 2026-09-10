<script setup>
defineProps({
  rows: { type: Number, default: 3 },
  type: { type: String, default: "text", validator: (v) => ["text", "avatar", "button", "heading"].includes(v) },
});
</script>

<template>
  <div class="animate-pulse space-y-3">
    <div v-for="i in rows" :key="i" :class="[
      type === 'avatar' ? 'w-10 h-10 rounded-full' : '',
      type === 'button' ? 'w-24 h-8 rounded-lg' : '',
      type === 'heading' ? 'w-48 h-6 rounded' : '',
      type === 'text' ? 'h-4 rounded' : '',
      type === 'text' && i === 1 ? 'w-3/4' : '',
      type === 'text' && i === 2 ? 'w-full' : '',
      type === 'text' && i === 3 ? 'w-5/6' : '',
      'bg-surface',
    ]" />
  </div>
</template>
