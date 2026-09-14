<script setup>
import { ref, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { listingService } from "@/services/listingService";
import { usePermission } from "@/composables/usePermission";
import { useToast } from "vue-toastification";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseBadge from "@/components/base/BaseBadge.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { canApproveListings } = usePermission();

const listings = ref([]);
const total = ref(0);
const page = ref(1);
const limit = 20;
const search = ref("");
const statusFilter = ref("");
const loading = ref(true);
const error = ref("");

async function fetchListings() {
  loading.value = true;
  error.value = "";
  try {
    const params = { page: page.value, limit };
    if (search.value) params.search = search.value;
    if (statusFilter.value) params.status = statusFilter.value;
    const result = await listingService.getListings(params);
    listings.value = result.listings;
    total.value = result.total;
  } catch (e) {
    error.value = e.message || "Failed to load listings";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchListings);

let searchTimeout = null;
watch(search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { page.value = 1; fetchListings(); }, 300);
});

watch(statusFilter, () => { page.value = 1; fetchListings(); });

function totalPages() { return Math.ceil(total.value / limit); }

function statusBadgeVariant(status) {
  const map = { pending: "warning", approved: "success", rejected: "danger", live: "info", sold: "purple" };
  return map[status] || "default";
}
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-heading">{{ t("admin.listings") }}</h1>
          <p class="text-muted mt-1">{{ t("admin.listings_queue") }}</p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex-1">
          <BaseInput v-model="search" :placeholder="t('common.search') + '...'" type="search" />
        </div>
        <select v-model="statusFilter" class="px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500">
          <option value="">{{ t("common.all") }} Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="live">Live</option>
          <option value="sold">Sold</option>
        </select>
      </div>

      <div v-if="loading" class="space-y-3">
        <BaseCard v-for="i in 5" :key="i"><BaseSkeleton :rows="2" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <div v-else-if="listings.length === 0">
        <BaseEmptyState title="No listings found" description="Try adjusting your filters" />
      </div>

      <div v-else>
        <BaseCard padding="none">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-surface">
                  <th class="px-4 py-3 text-left font-medium text-muted">Listing</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Seller</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Price</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Status</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Date</th>
                  <th class="px-4 py-3 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="listing in listings" :key="listing.id" class="border-b border-border last:border-0 hover:bg-surface/50">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div v-if="listing.images?.[0]" class="w-10 h-10 rounded-lg bg-surface overflow-hidden flex-shrink-0">
                        <img :src="listing.images[0]" class="w-full h-full object-cover" />
                      </div>
                      <div v-else class="w-10 h-10 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                        <svg class="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p class="font-medium text-heading">{{ listing.title }}</p>
                        <p class="text-xs text-muted">{{ listing.categories?.name || "Uncategorized" }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-muted">{{ listing.seller?.display_name || "Unknown" }}</td>
                  <td class="px-4 py-3 font-medium text-heading">${{ Number(listing.starting_price || 0).toLocaleString() }}</td>
                  <td class="px-4 py-3">
                    <BaseBadge :variant="statusBadgeVariant(listing.status)">{{ listing.status }}</BaseBadge>
                  </td>
                  <td class="px-4 py-3 text-muted">{{ new Date(listing.created_at).toLocaleDateString() }}</td>
                  <td class="px-4 py-3 text-right">
                    <BaseButton variant="ghost" size="sm" @click="router.push(`/admin/listings/${listing.id}`)">
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
            <BaseButton variant="secondary" size="sm" :disabled="page <= 1" @click="page--; fetchListings()">{{ t("common.previous") }}</BaseButton>
            <BaseButton variant="secondary" size="sm" :disabled="page >= totalPages()" @click="page++; fetchListings()">{{ t("common.next") }}</BaseButton>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
