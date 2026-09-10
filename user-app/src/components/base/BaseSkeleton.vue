<script setup>
defineProps({
  lines: { type: Number, default: 3 },
  type: { type: String, default: "text" },
});
</script>

<template>
  <div class="space-y-3">
    <template v-if="type === 'text'">
      <div v-for="i in lines" :key="i" class="h-4 bg-muted/20 rounded animate-pulse" :style="{ width: i === lines ? '60%' : '100%' }" />
    </template>
    <template v-else-if="type === 'card'">
      <div class="bg-white rounded-xl border border-border p-4 space-y-3">
        <div class="h-40 bg-muted/20 rounded-lg animate-pulse" />
        <div class="h-4 bg-muted/20 rounded animate-pulse w-3/4" />
        <div class="h-4 bg-muted/20 rounded animate-pulse w-1/2" />
        <div class="flex justify-between">
          <div class="h-6 bg-muted/20 rounded animate-pulse w-24" />
          <div class="h-6 bg-muted/20 rounded animate-pulse w-16" />
        </div>
      </div>
    </template>
    <template v-else-if="type === 'table'">
      <div v-for="i in lines" :key="i" class="flex gap-4">
        <div class="h-4 bg-muted/20 rounded animate-pulse flex-1" />
        <div class="h-4 bg-muted/20 rounded animate-pulse flex-1" />
        <div class="h-4 bg-muted/20 rounded animate-pulse flex-1" />
      </div>
    </template>
  </div>
</template>
