<script setup>
defineProps({
  columns: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  emptyMessage: { type: String, default: "No data found" },
});

defineEmits(["row-click"]);
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-border">
    <table class="min-w-full divide-y divide-border">
      <thead class="bg-surface">
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 text-left text-xs font-semibold text-heading uppercase tracking-wider"
            :style="col.width ? { width: col.width } : {}"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border bg-white">
        <tr v-if="loading">
          <td :colspan="columns.length" class="px-4 py-8 text-center">
            <div class="flex items-center justify-center gap-2 text-muted">
              <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading...
            </div>
          </td>
        </tr>
        <tr v-else-if="$slots.body">
          <slot name="body" />
        </tr>
        <tr v-else>
          <td :colspan="columns.length" class="px-4 py-12 text-center">
            <div class="flex flex-col items-center gap-2 text-muted">
              <svg class="w-12 h-12 text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <span>{{ emptyMessage }}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
