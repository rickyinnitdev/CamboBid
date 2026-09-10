<script setup>
import { ref, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { escrowService } from "@/services/escrowService";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseBadge from "@/components/base/BaseBadge.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();
const router = useRouter();

const transactions = ref([]);
const total = ref(0);
const page = ref(1);
const limit = 20;
const statusFilter = ref("");
const loading = ref(true);
const error = ref("");
const stats = ref({});

async function fetchTransactions() {
  loading.value = true;
  error.value = "";
  try {
    const params = { page: page.value, limit };
    if (statusFilter.value) params.status = statusFilter.value;
    const result = await escrowService.getEscrowTransactions(params);
    transactions.value = result.transactions;
    total.value = result.total;
  } catch (e) {
    error.value = e.message || "Failed to load escrow transactions";
  } finally {
    loading.value = false;
  }
}

async function fetchStats() {
  try {
    stats.value = await escrowService.getEscrowStats();
  } catch (e) {
    console.error("Failed to load stats:", e);
  }
}

onMounted(() => {
  fetchTransactions();
  fetchStats();
});

watch(statusFilter, () => { page.value = 1; fetchTransactions(); });

function totalPages() { return Math.ceil(total.value / limit); }

function statusBadgeVariant(status) {
  const map = { pending: "warning", held: "info", released: "success", frozen: "danger", refunded: "purple" };
  return map[status] || "default";
}
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-heading">{{ t("escrow.title") }}</h1>
          <p class="text-muted mt-1">Manage escrow transactions</p>
        </div>
      </div>

      <div v-if="stats.heldAmount !== undefined" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BaseCard>
          <p class="text-sm text-muted">Held in Escrow</p>
          <p class="text-2xl font-bold text-heading">${{ Number(stats.heldAmount || 0).toLocaleString() }}</p>
          <p class="text-xs text-muted">{{ stats.heldCount || 0 }} transactions</p>
        </BaseCard>
        <BaseCard>
          <p class="text-sm text-muted">Pending Release</p>
          <p class="text-2xl font-bold text-heading">${{ Number(stats.pendingAmount || 0).toLocaleString() }}</p>
          <p class="text-xs text-muted">{{ stats.pendingCount || 0 }} transactions</p>
        </BaseCard>
        <BaseCard>
          <p class="text-sm text-muted">Released</p>
          <p class="text-2xl font-bold text-heading">${{ Number(stats.releasedAmount || 0).toLocaleString() }}</p>
          <p class="text-xs text-muted">{{ stats.releasedCount || 0 }} transactions</p>
        </BaseCard>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <select v-model="statusFilter" class="px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500">
          <option value="">{{ t("common.all") }} Status</option>
          <option value="pending">Pending</option>
          <option value="held">Held</option>
          <option value="released">Released</option>
          <option value="frozen">Frozen</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div v-if="loading" class="space-y-3">
        <BaseCard v-for="i in 5" :key="i"><BaseSkeleton :rows="2" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <div v-else-if="transactions.length === 0">
        <BaseEmptyState title="No escrow transactions found" description="Transactions will appear here" />
      </div>

      <div v-else>
        <BaseCard padding="none">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-surface">
                  <th class="px-4 py-3 text-left font-medium text-muted">Listing</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Buyer</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Seller</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Amount</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Status</th>
                  <th class="px-4 py-3 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tx in transactions" :key="tx.id" class="border-b border-border last:border-0 hover:bg-surface/50">
                  <td class="px-4 py-3">
                    <p class="font-medium text-heading">{{ tx.auctions?.listings?.title || "Unknown" }}</p>
                  </td>
                  <td class="px-4 py-3 text-muted">{{ tx.profiles?.display_name || "Unknown" }}</td>
                  <td class="px-4 py-3 text-muted">{{ tx.profiles?.display_name || "Unknown" }}</td>
                  <td class="px-4 py-3 font-medium text-heading">${{ Number(tx.amount || 0).toLocaleString() }}</td>
                  <td class="px-4 py-3">
                    <BaseBadge :variant="statusBadgeVariant(tx.status)">{{ tx.status }}</BaseBadge>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <BaseButton variant="ghost" size="sm" @click="router.push(`/admin/escrow/${tx.id}`)">
                      {{ t("common.view") }}
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
            <BaseButton variant="secondary" size="sm" :disabled="page <= 1" @click="page--; fetchTransactions()">{{ t("common.previous") }}</BaseButton>
            <BaseButton variant="secondary" size="sm" :disabled="page >= totalPages()" @click="page++; fetchTransactions()">{{ t("common.next") }}</BaseButton>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
