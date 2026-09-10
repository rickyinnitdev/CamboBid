<script setup>
defineProps({
  columns: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  emptyMessage: { type: String, default: "No data found" },
});
</script>

<template>
  <div class="overflow-x-auto bg-white rounded-xl border border-border">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-border bg-surface">
          <th
            v-for="col in columns"
            :key="col.key"
            :class="['px-4 py-3 text-left font-medium text-muted', col.align === 'right' ? 'text-right' : '']"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length" class="px-4 py-12 text-center text-muted">
            <svg class="animate-spin h-6 w-6 mx-auto mb-2 text-navy-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </td>
        </tr>
        <tr v-else-if="$slots.body">
          <slot name="body" />
        </tr>
        <tr v-else>
          <td :colspan="columns.length" class="px-4 py-12 text-center text-muted">
            {{ emptyMessage }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
