<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { analyticsService } from "@/services/analyticsService";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();
const loading = ref(true);
const error = ref("");
const stats = ref({});

const kpis = ref([]);

onMounted(async () => {
  try {
    stats.value = await analyticsService.getDashboardStats();
    kpis.value = [
      { label: "Total Auctions", value: stats.value.totalAuctions, icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "bg-blue-500" },
      { label: "Active Auctions", value: stats.value.activeAuctions, icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "bg-green-500" },
      { label: "Total Users", value: stats.value.totalUsers, icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", color: "bg-purple-500" },
      { label: "Total Bids", value: stats.value.totalBids, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", color: "bg-yellow-500" },
      { label: "Total GMV", value: `$${Number(stats.value.totalGMV || 0).toLocaleString()}`, icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "bg-emerald-500" },
      { label: "Platform Revenue", value: `$${Number(stats.value.platformRevenue || 0).toLocaleString()}`, icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z", color: "bg-gold-500" },
      { label: "Open Disputes", value: stats.value.disputeCount, icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", color: "bg-red-500" },
    ];
  } catch (e) {
    error.value = e.message || "Failed to load dashboard";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-heading">{{ t("admin.dashboard") }}</h1>
        <p class="text-muted mt-1">Overview of your auction platform</p>
      </div>

      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BaseCard v-for="i in 7" :key="i">
          <BaseSkeleton type="heading" :rows="1" />
          <BaseSkeleton type="text" :rows="1" class="mt-2" />
        </BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {{ error }}
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BaseCard v-for="kpi in kpis" :key="kpi.label" padding="md">
          <div class="flex items-center gap-4">
            <div :class="[kpi.color, 'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0']">
              <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="kpi.icon" />
              </svg>
            </div>
            <div>
              <p class="text-sm text-muted">{{ kpi.label }}</p>
              <p class="text-2xl font-bold text-heading">{{ kpi.value }}</p>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </AdminLayout>
</template>
