<script setup>
import { ref, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { auctionService } from "@/services/auctionService";
import { usePermission } from "@/composables/usePermission";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseBadge from "@/components/base/BaseBadge.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();
const router = useRouter();
const { canManageAuctions } = usePermission();

const auctions = ref([]);
const total = ref(0);
const page = ref(1);
const limit = 20;
const statusFilter = ref("");
const loading = ref(true);
const error = ref("");

async function fetchAuctions() {
  loading.value = true;
  error.value = "";
  try {
    const params = { page: page.value, limit };
    if (statusFilter.value) params.status = statusFilter.value;
    const result = await auctionService.getAuctions(params);
    auctions.value = result.auctions;
    total.value = result.total;
  } catch (e) {
    error.value = e.message || "Failed to load auctions";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchAuctions);

watch(statusFilter, () => { page.value = 1; fetchAuctions(); });

function totalPages() { return Math.ceil(total.value / limit); }

function statusBadgeVariant(status) {
  const map = { draft: "default", live: "success", extended: "warning", closed: "info", cancelled: "danger" };
  return map[status] || "default";
}
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-heading">{{ t("admin.auctions") }}</h1>
          <p class="text-muted mt-1">Manage all auctions</p>
        </div>
        <BaseButton v-if="canManageAuctions" @click="router.push('/admin/auctions/create')">
          {{ t("common.add") }} Auction
        </BaseButton>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <select v-model="statusFilter" class="px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500">
          <option value="">{{ t("common.all") }} Status</option>
          <option value="draft">Draft</option>
          <option value="live">Live</option>
          <option value="extended">Extended</option>
          <option value="closed">Closed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div v-if="loading" class="space-y-3">
        <BaseCard v-for="i in 5" :key="i"><BaseSkeleton :rows="2" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <div v-else-if="auctions.length === 0">
        <BaseEmptyState title="No auctions found" description="Create your first auction" />
      </div>

      <div v-else>
        <BaseCard padding="none">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-surface">
                  <th class="px-4 py-3 text-left font-medium text-muted">Auction</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Current Price</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">End Time</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Status</th>
                  <th class="px-4 py-3 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="auction in auctions" :key="auction.id" class="border-b border-border last:border-0 hover:bg-surface/50">
                  <td class="px-4 py-3">
                    <div>
                      <p class="font-medium text-heading">{{ auction.listings?.title || "Unknown" }}</p>
                      <p class="text-xs text-muted">{{ auction.type }}</p>
                    </div>
                  </td>
                  <td class="px-4 py-3 font-medium text-heading">${{ Number(auction.current_price || 0).toLocaleString() }}</td>
                  <td class="px-4 py-3 text-muted">{{ auction.end_time ? new Date(auction.end_time).toLocaleString() : "N/A" }}</td>
                  <td class="px-4 py-3">
                    <BaseBadge :variant="statusBadgeVariant(auction.status)">{{ auction.status }}</BaseBadge>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <BaseButton variant="ghost" size="sm" @click="router.push(`/admin/auctions/${auction.id}/settings`)">
                      {{ t("admin.settings") }}
                    </BaseButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </BaseCard>

        <div v-if="totalPages() > 1" class="flex items-center justify-between mt-4">
          <p class="text-sm text-muted">Showing {{ (page - 1) * limit + 1 }}-{{ Math.min(page * limit, total) }} of {{ total }}</p>
          <div class="flex gap-2">
            <BaseButton variant="secondary" size="sm" :disabled="page <= 1" @click="page--; fetchAuctions()">{{ t("common.previous") }}</BaseButton>
            <BaseButton variant="secondary" size="sm" :disabled="page >= totalPages()" @click="page++; fetchAuctions()">{{ t("common.next") }}</BaseButton>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
