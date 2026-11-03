<script setup>
defineProps({
  columns: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  emptyMessage: { type: String, default: "No data found" },
});

defineEmits(["row-click"]);
</script>

<template>
  <div class="table-container">
    <table class="table">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="col.width ? { width: col.width } : {}"
            scope="col"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border bg-white">
        <tr v-if="loading">
          <td :colspan="columns.length" class="px-4 py-10 text-center">
            <div class="flex items-center justify-center gap-2 text-muted">
              <svg
                class="h-5 w-5 animate-spin"
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
              Loading
            </div>
          </td>
        </tr>
        <slot v-else-if="$slots.body" name="body" />
        <tr v-else>
          <td :colspan="columns.length" class="px-4 py-12 text-center text-muted">
            {{ emptyMessage }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
