<script setup>
import { ref, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { logService } from "@/services/logService";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();

const logs = ref([]);
const total = ref(0);
const page = ref(1);
const limit = 50;
const actionFilter = ref("");
const resourceFilter = ref("");
const startDate = ref("");
const endDate = ref("");
const loading = ref(true);
const error = ref("");
const actionTypes = ref([]);
const resourceTypes = ref([]);

async function fetchLogs() {
  loading.value = true;
  error.value = "";
  try {
    const params = { page: page.value, limit };
    if (actionFilter.value) params.action = actionFilter.value;
    if (resourceFilter.value) params.resourceType = resourceFilter.value;
    if (startDate.value) params.startDate = startDate.value;
    if (endDate.value) params.endDate = endDate.value;
    const result = await logService.getLogs(params);
    logs.value = result.logs;
    total.value = result.total;
  } catch (e) {
    error.value = e.message || "Failed to load logs";
  } finally {
    loading.value = false;
  }
}

async function fetchFilters() {
  try {
    const [actions, resources] = await Promise.all([
      logService.getActionTypes(),
      logService.getResourceTypes(),
    ]);
    actionTypes.value = actions;
    resourceTypes.value = resources;
  } catch (e) {
    console.error("Failed to load filters:", e);
  }
}

onMounted(() => {
  fetchLogs();
  fetchFilters();
});

watch([actionFilter, resourceFilter, startDate, endDate], () => { page.value = 1; fetchLogs(); });

function totalPages() { return Math.ceil(total.value / limit); }

async function exportCSV() {
  try {
    const csv = await logService.exportToCSV({
      action: actionFilter.value || undefined,
      resourceType: resourceFilter.value || undefined,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined,
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "activity-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Export failed:", e);
  }
}

function formatAction(action) {
  return action?.replace(/_/g, " ") || "";
}
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-heading">{{ t("admin.logs") }}</h1>
          <p class="text-muted mt-1">Track all platform activity</p>
        </div>
        <BaseButton variant="secondary" @click="exportCSV">{{ t("admin.export_csv") }}</BaseButton>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <select v-model="actionFilter" class="px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500">
          <option value="">All Actions</option>
          <option v-for="action in actionTypes" :key="action" :value="action">{{ formatAction(action) }}</option>
        </select>
        <select v-model="resourceFilter" class="px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500">
          <option value="">All Resources</option>
          <option v-for="res in resourceTypes" :key="res" :value="res">{{ res }}</option>
        </select>
        <BaseInput v-model="startDate" type="date" placeholder="Start date" />
        <BaseInput v-model="endDate" type="date" placeholder="End date" />
      </div>

      <div v-if="loading" class="space-y-3">
        <BaseCard v-for="i in 5" :key="i"><BaseSkeleton :rows="2" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <div v-else-if="logs.length === 0">
        <BaseEmptyState title="No logs found" description="Try adjusting your filters" />
      </div>

      <div v-else>
        <BaseCard padding="none">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-surface">
                  <th class="px-4 py-3 text-left font-medium text-muted">Actor</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Action</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Resource</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Time</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in logs" :key="log.id" class="border-b border-border last:border-0 hover:bg-surface/50">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full bg-navy-700 flex items-center justify-center">
                        <span class="text-xs font-semibold text-white">{{ (log.profiles?.display_name || "S").charAt(0).toUpperCase() }}</span>
                      </div>
                      <span class="text-heading">{{ log.profiles?.display_name || "System" }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-1 bg-surface rounded text-xs font-medium text-heading">{{ formatAction(log.action) }}</span>
                  </td>
                  <td class="px-4 py-3 text-muted">{{ log.resource_type }}{{ log.resource_id ? ` #${log.resource_id.slice(0, 8)}` : "" }}</td>
                  <td class="px-4 py-3 text-muted">{{ new Date(log.created_at).toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </BaseCard>

        <div v-if="totalPages() > 1" class="flex items-center justify-between mt-4">
          <p class="text-sm text-muted">Showing {{ (page - 1) * limit + 1 }}-{{ Math.min(page * limit, total) }} of {{ total }}</p>
          <div class="flex gap-2">
            <BaseButton variant="secondary" size="sm" :disabled="page <= 1" @click="page--; fetchLogs()">{{ t("common.previous") }}</BaseButton>
            <BaseButton variant="secondary" size="sm" :disabled="page >= totalPages()" @click="page++; fetchLogs()">{{ t("common.next") }}</BaseButton>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
