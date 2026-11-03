<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import StatusBadge from "@/components/auction/StatusBadge.vue";
import { bidService } from "@/services/bidService";
import { formatDateTime, formatUSD } from "@/utils/format";

const { t } = useI18n();
const bids = ref([]);
const loading = ref(true);
const error = ref("");

const activeCount = computed(
  () =>
    bids.value.filter((bid) => bid.status === "winning" || bid.status === "active")
      .length,
);

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
</script>

<template>
  <UserLayout>
    <main class="page-container max-w-4xl">
      <div class="page-header">
        <div>
          <p class="kicker">Activity</p>
          <h1 class="page-title mt-3">{{ t("nav.my_bids") }}</h1>
          <p class="page-subtitle mt-3">
            Review your bids, outcomes and active positions.
          </p>
        </div>
        <router-link to="/auctions" class="btn-outline btn-sm self-start sm:self-auto">
          Browse auctions
        </router-link>
      </div>

      <div v-if="loading" class="space-y-3">
        <BaseSkeleton v-for="i in 5" :key="i" type="card" />
      </div>

      <div
        v-else-if="error"
        role="alert"
        class="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger"
      >
        {{ error }}
      </div>

      <BaseEmptyState
        v-else-if="bids.length === 0"
        title="No bids yet"
        description="You haven't placed any bids yet. Browse auctions to find your first lot."
        icon="auction"
      >
        <template #action>
          <router-link to="/auctions" class="btn-primary btn-sm mt-5">
            Browse auctions
          </router-link>
        </template>
      </BaseEmptyState>

      <template v-else>
        <div class="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-body">
          <span>
            <strong class="font-semibold text-heading">{{ bids.length }}</strong>
            {{ bids.length === 1 ? "bid" : "bids" }}
          </span>
          <span class="text-border" aria-hidden="true">|</span>
          <span>
            <strong class="font-semibold text-heading">{{ activeCount }}</strong>
            active or winning
          </span>
        </div>

        <div class="space-y-3">
          <BaseCard v-for="bid in bids" :key="bid.id" hover>
            <router-link
              :to="`/auctions/${bid.auctions?.id}`"
              class="flex items-center gap-4 p-4"
            >
              <div
                class="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface"
              >
                <img
                  v-if="getAuctionImage(bid)"
                  :src="getAuctionImage(bid)"
                  :alt="getAuctionTitle(bid)"
                  class="h-full w-full object-cover"
                />
                <div v-else class="grid h-full w-full place-items-center">
                  <svg
                    class="h-6 w-6 text-muted/40"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>

              <div class="min-w-0 flex-1">
                <h2 class="truncate text-sm font-semibold text-heading">
                  {{ getAuctionTitle(bid) }}
                </h2>
                <p class="mt-1 text-xs text-muted">
                  {{ formatDateTime(bid.placed_at) }}
                </p>
              </div>

              <div class="shrink-0 text-right">
                <p class="numeric text-sm font-semibold text-heading">
                  {{ formatUSD(bid.amount) }}
                </p>
                <StatusBadge
                  :status="bid.status"
                  type="bid"
                  class="mt-1.5"
                />
              </div>
            </router-link>
          </BaseCard>
        </div>
      </template>
    </main>
  </UserLayout>
</template>
