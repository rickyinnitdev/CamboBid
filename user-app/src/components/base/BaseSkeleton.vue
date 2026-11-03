<script setup>
defineProps({
  lines: { type: Number, default: 3 },
  type: { type: String, default: "text" },
});
</script>

<template>
  <div class="space-y-3" aria-hidden="true">
    <template v-if="type === 'text'">
      <div
        v-for="i in lines"
        :key="i"
        class="h-4 animate-pulse rounded bg-slate-200/70"
        :style="{ width: i === lines ? '60%' : '100%' }"
      />
    </template>
    <template v-else-if="type === 'card'">
      <div class="space-y-4 rounded-2xl border border-border bg-white p-3">
        <div class="aspect-[4/5] animate-pulse rounded-xl bg-slate-200/70" />
        <div class="space-y-2 px-1">
          <div class="h-3 w-20 animate-pulse rounded bg-slate-200/70" />
          <div class="h-4 w-4/5 animate-pulse rounded bg-slate-200/70" />
          <div class="h-4 w-2/3 animate-pulse rounded bg-slate-200/70" />
          <div class="flex items-end justify-between pt-2">
            <div class="h-6 w-24 animate-pulse rounded bg-slate-200/70" />
            <div class="h-4 w-14 animate-pulse rounded bg-slate-200/70" />
          </div>
        </div>
      </div>
    </template>
    <template v-else-if="type === 'table'">
      <div v-for="i in lines" :key="i" class="flex gap-4">
        <div class="h-4 flex-1 animate-pulse rounded bg-slate-200/70" />
        <div class="h-4 flex-1 animate-pulse rounded bg-slate-200/70" />
        <div class="h-4 flex-1 animate-pulse rounded bg-slate-200/70" />
      </div>
    </template>
  </div>
</template>
