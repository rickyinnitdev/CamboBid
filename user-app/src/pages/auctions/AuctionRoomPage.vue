<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "@/composables/useAuth";
import { auctionService } from "@/services/auctionService";
import { bidService } from "@/services/bidService";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseBadge from "@/components/base/BaseBadge.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import CountdownTimer from "@/components/auction/CountdownTimer.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { user, isAuthenticated, isVerifiedBidder } = useAuth();

const auction = ref(null);
const bids = ref([]);
const loading = ref(true);
const error = ref("");
const bidAmount = ref("");
const proxyMax = ref("");
const isProxy = ref(false);
const bidding = ref(false);
const bidError = ref("");
const bidSuccess = ref("");
const auctionChannel = ref(null);

const auctionId = computed(() => route.params.id);

const isLive = computed(() => ["live", "extended"].includes(auction.value?.status));
const isEnded = computed(() => auction.value?.status === "closed");
const isScheduled = computed(() => auction.value?.status === "scheduled");

const listing = computed(() => auction.value?.listings || {});
const seller = computed(() => auction.value?.profiles || {});

const minBid = computed(() => {
  const current = Number(auction.value?.current_price || 0);
  const increment = Number(auction.value?.bid_increment || 1);
  return current + increment;
});

const imageUrl = computed(() => {
  const images = listing.value.images;
  if (Array.isArray(images) && images.length > 0) {
    return typeof images[0] === "string" ? images[0] : images[0]?.url;
  }
  return null;
});

async function loadAuction() {
  try {
    auction.value = await auctionService.getAuctionById(auctionId.value);
    bids.value = await auctionService.getAuctionBids(auctionId.value);
  } catch (err) {
    error.value = err.message || "Failed to load auction.";
  } finally {
    loading.value = false;
  }
}

async function placeBid() {
  if (!isAuthenticated.value) {
    router.push({ name: "Login", query: { redirect: route.fullPath } });
    return;
  }
  bidError.value = "";
  bidSuccess.value = "";
  bidding.value = true;
  try {
    const fingerprint = await bidService.generateDeviceFingerprint();
    await bidService.placeBid({
      auctionId: auctionId.value,
      amount: Number(bidAmount.value),
      proxyMaxAmount: isProxy.value ? Number(proxyMax.value) : null,
      isProxy: isProxy.value,
      deviceFingerprint: fingerprint,
    });
    bidSuccess.value = t("bid.success");
    bidAmount.value = "";
    proxyMax.value = "";
    isProxy.value = false;
    await loadAuction();
  } catch (err) {
    bidError.value = err.message || "Failed to place bid.";
  } finally {
    bidding.value = false;
  }
}

function subscribeToAuction() {
  auctionChannel.value = auctionService.subscribeToAuction(auctionId.value, (event, payload) => {
    if (event === "new_bid") {
      bids.value.unshift(payload);
      if (auction.value) {
        auction.value.current_price = payload.amount;
      }
    } else if (event === "auction_update") {
      if (auction.value) {
        Object.assign(auction.value, payload);
      }
    } else if (event === "auction_closed") {
      loadAuction();
    }
  });
}

onMounted(async () => {
  await loadAuction();
  if (isLive.value) {
    subscribeToAuction();
  }
});

onUnmounted(() => {
  auctionService.unsubscribeFromAuction(auctionChannel.value);
});

watch(
  () => auction.value?.status,
  (newStatus) => {
    if (["live", "extended"].includes(newStatus) && !auctionChannel.value) {
      subscribeToAuction();
    }
  }
);
</script>

<template>
  <UserLayout>
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div v-if="loading" class="space-y-6">
        <BaseSkeleton type="card" />
      </div>

      <div v-else-if="error" class="p-4 rounded-lg bg-danger/10 text-danger text-sm">
        {{ error }}
        <BaseButton variant="outline" size="sm" class="ml-4" @click="loadAuction">Retry</BaseButton>
      </div>

      <template v-else-if="auction">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Left: Images & Details -->
          <div class="lg:col-span-2 space-y-6">
            <div class="aspect-[4/3] bg-surface rounded-xl overflow-hidden">
              <img v-if="imageUrl" :src="imageUrl" :alt="listing.title" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-16 h-16 text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <BaseCard>
              <div class="p-6">
                <div class="flex items-start justify-between mb-4">
                  <div>
                    <h1 class="text-2xl font-bold text-heading">{{ listing.title }}</h1>
                    <div class="flex items-center gap-2 mt-2 text-sm text-muted">
                      <span v-if="listing.categories?.name">{{ listing.categories.name }}</span>
                      <span v-if="listing.condition">• {{ listing.condition }}</span>
                      <span>• Listed by {{ seller.display_name }}</span>
                    </div>
                  </div>
                  <BaseBadge v-if="isLive" variant="live" pulse>{{ t("auction.live") }}</BaseBadge>
                  <BaseBadge v-else-if="isEnded" variant="default">Ended</BaseBadge>
                  <BaseBadge v-else-if="isScheduled" variant="info">Upcoming</BaseBadge>
                </div>
                <p class="text-sm text-body whitespace-pre-wrap">{{ listing.description }}</p>
              </div>
            </BaseCard>

            <!-- Bid History -->
            <BaseCard>
              <div class="p-6">
                <h2 class="text-lg font-semibold text-heading mb-4">{{ t("auction.bid_history") }}</h2>
                <div v-if="bids.length === 0" class="text-sm text-muted py-4 text-center">
                  {{ t("auction.no_bids") }}
                </div>
                <div v-else class="space-y-3 max-h-80 overflow-y-auto">
                  <div
                    v-for="bid in bids"
                    :key="bid.id"
                    class="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center">
                        <span class="text-xs font-semibold text-white">
                          {{ (bid.profiles?.display_name || "U").charAt(0).toUpperCase() }}
                        </span>
                      </div>
                      <div>
                        <p class="text-sm font-medium text-heading">{{ bid.profiles?.display_name }}</p>
                        <p class="text-xs text-muted">{{ new Date(bid.placed_at).toLocaleString() }}</p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="font-bold font-mono text-gold-600">${{ Number(bid.amount).toLocaleString() }}</p>
                      <p v-if="bid.is_proxy" class="text-xs text-muted">Proxy</p>
                    </div>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>

          <!-- Right: Bidding Panel -->
          <div class="space-y-6">
            <BaseCard>
              <div class="p-6 space-y-4">
                <div class="text-center">
                  <p class="text-sm text-muted mb-1">{{ t("auction.current_price") }}</p>
                  <p class="text-3xl font-bold font-mono text-gold-600">
                    ${{ Number(auction.current_price || 0).toLocaleString() }}
                  </p>
                </div>

                <CountdownTimer
                  v-if="isLive"
                  :end-time="auction.end_time"
                  :status="auction.status"
                />
                <div v-else-if="isScheduled" class="text-center text-sm text-muted">
                  Starts {{ new Date(auction.start_time).toLocaleString() }}
                </div>
                <div v-else-if="isEnded" class="text-center text-sm text-muted">
                  {{ t("auction.ended") }}
                </div>

                <div class="text-center text-xs text-muted">
                  Min bid: ${{ minBid.toLocaleString() }}
                </div>

                <!-- Bid Form -->
                <form v-if="isLive && isAuthenticated" @submit.prevent="placeBid" class="space-y-3">
                  <div v-if="bidError" class="p-2 rounded bg-danger/10 text-danger text-xs">{{ bidError }}</div>
                  <div v-if="bidSuccess" class="p-2 rounded bg-success/10 text-success text-xs">{{ bidSuccess }}</div>

                  <BaseInput
                    v-model="bidAmount"
                    :label="t('auction.place_bid')"
                    type="number"
                    :placeholder="`Min $${minBid}`"
                    required
                  />

                  <label class="flex items-center gap-2 text-sm text-heading cursor-pointer">
                    <input type="checkbox" v-model="isProxy" class="rounded border-border" />
                    {{ t("auction.proxy_bid") }}
                  </label>

                  <BaseInput
                    v-if="isProxy"
                    v-model="proxyMax"
                    :label="t('auction.proxy_bid_max')"
                    type="number"
                    placeholder="Maximum amount"
                  />

                  <BaseButton type="submit" variant="gold" :loading="bidding" class="w-full">
                    {{ t("auction.place_bid") }}
                  </BaseButton>
                </form>

                <div v-else-if="!isAuthenticated" class="text-center">
                  <router-link to="/login" class="text-sm font-medium text-navy-700 hover:text-navy-800">
                    Login to place a bid
                  </router-link>
                </div>
              </div>
            </BaseCard>
          </div>
        </div>
      </template>
    </div>
  </UserLayout>
</template>
