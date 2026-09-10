<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { analyticsService } from "@/services/analyticsService";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import VueApexCharts from "vue3-apexcharts";

const { t } = useI18n();
const loading = ref(true);
const error = ref("");

const revenueChart = ref({ series: [], options: {} });
const categoryChart = ref({ series: [], options: {} });
const escrowChart = ref({ series: [], options: {} });
const bidCloseChart = ref({ series: [], options: {} });

async function fetchAnalytics() {
  loading.value = true;
  error.value = "";
  try {
    const [revenue, categories, escrowSummary, bidRate] = await Promise.all([
      analyticsService.getRevenueByMonth(),
      analyticsService.getCategoryPerformance(),
      analyticsService.getEscrowSummary(),
      analyticsService.getBidToCloseRate(),
    ]);

    revenueChart.value = {
      series: [{ name: "Revenue", data: revenue.map((r) => r.revenue) }],
      options: {
        chart: { type: "area", height: 300, toolbar: { show: false } },
        xaxis: { categories: revenue.map((r) => r.month) },
        colors: ["#1e3a5f"],
        fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.3 } },
        title: { text: "Revenue by Month", style: { fontSize: "14px", fontWeight: "600" } },
      },
    };

    categoryChart.value = {
      series: [
        { name: "Avg Price", data: categories.map((c) => c.avgPrice) },
        { name: "Total Revenue", data: categories.map((c) => c.totalRevenue) },
      ],
      options: {
        chart: { type: "bar", height: 300, toolbar: { show: false } },
        xaxis: { categories: categories.map((c) => c.name) },
        colors: ["#1e3a5f", "#d4a843"],
        title: { text: "Category Performance", style: { fontSize: "14px", fontWeight: "600" } },
      },
    };

    const escrowLabels = Object.keys(escrowSummary);
    const escrowValues = Object.values(escrowSummary);
    escrowChart.value = {
      series: escrowValues,
      options: {
        chart: { type: "donut", height: 300 },
        labels: escrowLabels.map((l) => l.charAt(0).toUpperCase() + l.slice(1)),
        colors: ["#f59e0b", "#3b82f6", "#22c55e", "#ef4444", "#a855f7"],
        title: { text: "Escrow Summary", style: { fontSize: "14px", fontWeight: "600" } },
      },
    };

    bidCloseChart.value = {
      series: [bidRate.rate, 100 - bidRate.rate],
      options: {
        chart: { type: "pie", height: 300 },
        labels: ["Closed", "Not Closed"],
        colors: ["#22c55e", "#e5e7eb"],
        title: { text: `Bid-to-Close Rate: ${bidRate.rate.toFixed(1)}%`, style: { fontSize: "14px", fontWeight: "600" } },
      },
    };
  } catch (e) {
    error.value = e.message || "Failed to load analytics";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchAnalytics);
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-heading">{{ t("admin.analytics") }}</h1>
        <p class="text-muted mt-1">Platform performance insights</p>
      </div>

      <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BaseCard v-for="i in 4" :key="i"><BaseSkeleton type="text" :rows="6" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <template v-else>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BaseCard>
            <VueApexCharts type="area" :options="revenueChart.options" :series="revenueChart.series" height="300" />
          </BaseCard>
          <BaseCard>
            <VueApexCharts type="bar" :options="categoryChart.options" :series="categoryChart.series" height="300" />
          </BaseCard>
          <BaseCard>
            <VueApexCharts type="donut" :options="escrowChart.options" :series="escrowChart.series" height="300" />
          </BaseCard>
          <BaseCard>
            <VueApexCharts type="pie" :options="bidCloseChart.options" :series="bidCloseChart.series" height="300" />
          </BaseCard>
        </div>
      </template>
    </div>
  </AdminLayout>
</template>
