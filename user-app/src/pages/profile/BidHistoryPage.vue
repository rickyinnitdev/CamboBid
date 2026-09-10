<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import StatusBadge from "@/components/auction/StatusBadge.vue";
import { bidService } from "@/services/bidService";

const { t } = useI18n();
const bids = ref([]);
const loading = ref(true);
const error = ref("");

onMounted(async () => {
  try {
    bids.value = await bidService.getMyBids();
  } catch (err) {
    error.value = err.message || "Failed to load bid history.";
  } finally {
    loading.value = false;
  }
});

function getAuctionTitle(bid) {
  return bid.auctions?.listings?.title || "Untitled Auction";
}

function getAuctionImage(bid) {
  const images = bid.auctions?.listings?.images;
  if (Array.isArray(images) && images.length > 0) {
    return typeof images[0] === "string" ? images[0] : images[0]?.url;
  }
  return null;
}

function isWinning(bid) {
  return bid.status === "winning" || bid.status === "active";
}
</script>

<template>
  <UserLayout>
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 class="text-2xl font-bold text-heading mb-8">{{ t("nav.my_bids") }}</h1>

      <div v-if="loading" class="space-y-4">
        <BaseSkeleton v-for="i in 5" :key="i" type="card" />
      </div>

      <div v-else-if="error" class="p-4 rounded-lg bg-danger/10 text-danger text-sm">
        {{ error }}
      </div>

      <BaseEmptyState
        v-else-if="bids.length === 0"
        title="No Bids Yet"
        description="You haven't placed any bids yet. Browse auctions to get started!"
        icon="auction"
      >
        <template #action>
          <router-link to="/auctions" class="mt-4 inline-flex items-center px-4 py-2 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors">
            Browse Auctions
          </router-link>
        </template>
      </BaseEmptyState>

      <div v-else class="space-y-4">
        <BaseCard v-for="bid in bids" :key="bid.id">
          <router-link :to="`/auctions/${bid.auctions?.id}`" class="flex items-center gap-4 p-4 hover:bg-surface/50 transition-colors">
            <div class="w-16 h-16 rounded-lg bg-surface overflow-hidden flex-shrink-0">
              <img v-if="getAuctionImage(bid)" :src="getAuctionImage(bid)" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-6 h-6 text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-heading truncate">{{ getAuctionTitle(bid) }}</h3>
              <p class="text-xs text-muted mt-0.5">
                {{ new Date(bid.placed_at).toLocaleString() }}
              </p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="font-bold font-mono text-gold-600">${{ Number(bid.amount).toLocaleString() }}</p>
              <StatusBadge :status="bid.status" type="bid" class="mt-1" />
            </div>
          </router-link>
        </BaseCard>
      </div>
    </div>
  </UserLayout>
</template>
