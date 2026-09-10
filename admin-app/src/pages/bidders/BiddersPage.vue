<script setup>
import { ref, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { userService } from "@/services/userService";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseBadge from "@/components/base/BaseBadge.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();
const router = useRouter();

const bidders = ref([]);
const total = ref(0);
const page = ref(1);
const limit = 20;
const verifiedFilter = ref("");
const suspendedFilter = ref("");
const loading = ref(true);
const error = ref("");

async function fetchBidders() {
  loading.value = true;
  error.value = "";
  try {
    const params = { page: page.value, limit };
    if (verifiedFilter.value !== "") params.verified = verifiedFilter.value === "true";
    if (suspendedFilter.value !== "") params.suspended = suspendedFilter.value === "true";
    const result = await userService.getBidders(params);
    bidders.value = result.bidders;
    total.value = result.total;
  } catch (e) {
    error.value = e.message || "Failed to load bidders";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchBidders);

watch([verifiedFilter, suspendedFilter], () => { page.value = 1; fetchBidders(); });

function totalPages() { return Math.ceil(total.value / limit); }
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-heading">{{ t("admin.bidders") }}</h1>
          <p class="text-muted mt-1">Manage bidder accounts and verification</p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <select v-model="verifiedFilter" class="px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500">
          <option value="">All Verification</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <select v-model="suspendedFilter" class="px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500">
          <option value="">All Status</option>
          <option value="false">Active</option>
          <option value="true">Suspended</option>
        </select>
      </div>

      <div v-if="loading" class="space-y-3">
        <BaseCard v-for="i in 5" :key="i"><BaseSkeleton :rows="2" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <div v-else-if="bidders.length === 0">
        <BaseEmptyState title="No bidders found" description="Try adjusting your filters" />
      </div>

      <div v-else>
        <BaseCard padding="none">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-surface">
                  <th class="px-4 py-3 text-left font-medium text-muted">Bidder</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Verification</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Status</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Deposit</th>
                  <th class="px-4 py-3 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="bidder in bidders" :key="bidder.id" class="border-b border-border last:border-0 hover:bg-surface/50">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center">
                        <span class="text-xs font-semibold text-white">{{ (bidder.display_name || "U").charAt(0).toUpperCase() }}</span>
                      </div>
                      <div>
                        <p class="font-medium text-heading">{{ bidder.display_name || "Unnamed" }}</p>
                        <p class="text-xs text-muted">{{ bidder.email }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <BaseBadge :variant="bidder.identity_verified ? 'success' : 'warning'">
                      {{ bidder.identity_verified ? 'Verified' : 'Pending' }}
                    </BaseBadge>
                  </td>
                  <td class="px-4 py-3">
                    <BaseBadge :variant="bidder.suspended ? 'danger' : 'success'">
                      {{ bidder.suspended ? 'Suspended' : 'Active' }}
                    </BaseBadge>
                  </td>
                  <td class="px-4 py-3">
                    <BaseBadge :variant="bidder.deposit_paid ? 'success' : 'warning'">
                      {{ bidder.deposit_paid ? 'Paid' : 'Unpaid' }}
                    </BaseBadge>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <BaseButton variant="ghost" size="sm" @click="router.push(`/admin/bidders/${bidder.id}`)">
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
            <BaseButton variant="secondary" size="sm" :disabled="page <= 1" @click="page--; fetchBidders()">{{ t("common.previous") }}</BaseButton>
            <BaseButton variant="secondary" size="sm" :disabled="page >= totalPages()" @click="page++; fetchBidders()">{{ t("common.next") }}</BaseButton>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
