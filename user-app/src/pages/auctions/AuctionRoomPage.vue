<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { orderService } from "@/services/orderService";
import { auctionService } from "@/services/auctionService";
import { walletService } from "@/services/walletService";
import { bidService } from "@/services/bidService";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import InlineKhqr from "@/components/auction/InlineKhqr.vue";
import CountdownTimer from "@/components/auction/CountdownTimer.vue";
import AuctionStatusBadge from "@/components/auction/AuctionStatusBadge.vue";
import PriceDisplay from "@/components/auction/PriceDisplay.vue";
import { marketplace } from "@/data/marketplace";
import {
  getAuctionState,
  getBidCount,
  getImages,
  getListing,
  getNextMinimumBid,
  getReserveLabel,
} from "@/utils/auctionPresentation";
import { formatDateTime, formatUSD } from "@/utils/format";

const route = useRoute();
const router = useRouter();
const { user, isAuthenticated, isVerifiedBidder } = useAuth();

const wallet = ref(null);
const clock = ref(Date.now());
const settledOrder = ref(null);
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
const activeImage = ref(0);

const auctionId = computed(() => route.params.id);
const listing = computed(() => getListing(auction.value));
const seller = computed(() => listing.value.seller || {});
const state = computed(() => getAuctionState(auction.value, clock.value));
const isEnded = computed(() => state.value.isEnded);
const isLive = computed(() => state.value.canBid);
const isScheduled = computed(() => state.value.key === "upcoming");
const isSeller = computed(
  () => !!user.value?.id && user.value.id === listing.value.seller_id,
);
const images = computed(() => getImages(listing.value));
const imageUrl = computed(() => images.value[activeImage.value] || images.value[0] || null);
const bidCount = computed(() => getBidCount(auction.value));
const reserveLabel = computed(() =>
  listing.value.reserve_price == null ? "No reserve" : getReserveLabel(auction.value),
);
const minBid = computed(() => getNextMinimumBid(auction.value));

const auctionWallet = computed(
  () =>
    wallet.value?.accounts.find(
      (account) => account.mode === (auction.value?.payment_mode || "demo"),
    ) || { available: 0, reserved: 0 },
);

const buyNowPrice = computed(() => Number(listing.value.buy_it_now_price || 0));
const canBuyNow = computed(
  () =>
    isLive.value &&
    buyNowPrice.value > 0 &&
    buyNowPrice.value >= Number(auction.value?.current_price || 0) &&
    buyNowPrice.value >= Number(listing.value.reserve_price || 0),
);

const buying = ref(false);
const purchaseError = ref("");
const qrPayment = ref(null);
const qrBusy = ref(false);
const liveEnabled = ref(true);
let qrController;
let disposed = false;
let clockTimer;
let settlementTimer;

const conditionLabel = computed(() => {
  const condition = listing.value.condition;
  if (!condition) return "Not stated";
  return condition.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
});

const typeLabel = computed(() => {
  const type = auction.value?.type || "english";
  return type.charAt(0).toUpperCase() + type.slice(1);
});

async function loadWallet() {
  if (isAuthenticated.value) {
    try {
      wallet.value = await walletService.overview();
    } catch {
      wallet.value = null;
    }
  }
}

async function startQr(kind) {
  if (isSeller.value || !isLive.value || qrBusy.value) return;
  if (marketplace.isMockMode) {
    bidError.value = "Demonstration mode does not send payments.";
    return;
  }
  if (!isAuthenticated.value) {
    await router.push({ name: "Login", query: { redirect: route.fullPath } });
    return;
  }
  if (kind === "bid" && isProxy.value) {
    bidError.value =
      "Use wallet funds for proxy bids. KHQR supports the bid amount entered below.";
    return;
  }
  const dollars = kind === "buy" ? buyNowPrice.value : Number(bidAmount.value);
  const cents = Math.round(dollars * 100);
  if (
    !Number.isSafeInteger(cents) ||
    cents < 1 ||
    cents > 100000 ||
    Math.abs(dollars * 100 - cents) > 0.00001 ||
    (kind === "bid" && dollars < minBid.value)
  ) {
    bidError.value =
      "Enter a valid bid at or above the current minimum ($0.01–$1,000 for KHQR).";
    return;
  }
  if (qrPayment.value?.status === "pending") {
    purchaseError.value =
      "Check the existing QR payment before starting another. Its amount is shown below.";
    return;
  }
  qrBusy.value = true;
  purchaseError.value = "";
  bidError.value = "";
  qrController = new AbortController();
  const signal = AbortSignal.any([
    qrController.signal,
    AbortSignal.timeout(35000),
  ]);
  try {
    const payment =
      kind === "buy"
        ? await walletService.createPurchase(cents, auctionId.value, signal)
        : await walletService.createBid(cents, auctionId.value, signal);
    if (!disposed) qrPayment.value = payment;
  } catch (e) {
    if (!disposed) purchaseError.value = e.message;
  } finally {
    qrBusy.value = false;
  }
}

async function buyWithQr() {
  await startQr("buy");
}

async function qrUpdated(payment) {
  const previous = qrPayment.value?.status;
  qrPayment.value = payment;
  if (payment.status !== previous && payment.status === "paid") {
    await Promise.all([loadAuction(), loadWallet()]);
  }
}

async function buyNow() {
  if (marketplace.isMockMode) {
    purchaseError.value = "Demonstration mode does not send purchases.";
    return;
  }
  if (isSeller.value) {
    purchaseError.value = "You cannot buy your own item.";
    return;
  }
  if (!isAuthenticated.value) {
    await router.push({ name: "Login", query: { redirect: route.fullPath } });
    return;
  }
  if (!canBuyNow.value || buying.value || bidding.value) return;
  const amount = buyNowPrice.value.toFixed(2);
  const mode = auction.value.payment_mode || "demo";
  if (
    !window.confirm(
      `Buy this item for $${amount} using ${mode} wallet funds? This ends the auction and holds your payment until delivery confirmation.`,
    )
  )
    return;
  purchaseError.value = "";
  buying.value = true;
  try {
    const result = await auctionService.buyNow(
      auctionId.value,
      Math.round(buyNowPrice.value * 100),
    );
    await router.push("/orders/" + result.order_id);
  } catch (e) {
    purchaseError.value =
      e.message || "Purchase failed. Check your orders before retrying.";
    await loadAuction();
    await loadWallet();
  } finally {
    buying.value = false;
  }
}

async function loadAuction() {
  try {
    const data = await marketplace.getAuctionById(auctionId.value);
    if (!data) {
      error.value = "This auction could not be found.";
      return;
    }
    auction.value = data;
    bids.value = await marketplace.getAuctionBids(auctionId.value);
    if (
      isAuthenticated.value &&
      (isSeller.value || auction.value.winner_id === user.value?.id)
    )
      settledOrder.value = await orderService.getAuctionOrder(auctionId.value);
  } catch (err) {
    error.value = err.message || "Failed to load auction.";
  } finally {
    loading.value = false;
  }
}

async function placeBid() {
  if (marketplace.isMockMode) {
    bidError.value = "Demonstration mode does not send bids to the backend.";
    return;
  }
  if (isSeller.value) {
    bidError.value = "You cannot bid on your own item.";
    return;
  }
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
    bidSuccess.value =
      "Bid placed successfully. The final result is confirmed after the auction ends.";
    bidAmount.value = "";
    proxyMax.value = "";
    isProxy.value = false;
    await loadAuction();
    await loadWallet();
  } catch (err) {
    bidError.value = err.message || "Failed to place bid.";
  } finally {
    bidding.value = false;
  }
}

function subscribeToAuction() {
  if (marketplace.isMockMode || auctionChannel.value) return;
  auctionChannel.value = auctionService.subscribeToAuction(
    auctionId.value,
    (event, payload) => {
      if (event === "new_bid") {
        loadAuction();
        loadWallet();
      } else if (event === "auction_update") {
        if (auction.value) {
          Object.assign(auction.value, payload);
          loadAuction();
          loadWallet();
        }
      } else if (event === "auction_closed") {
        loadAuction();
      }
    },
  );
}

watch(
  () => auction.value?.status,
  (newStatus) => {
    if (["live", "extended"].includes(newStatus) && !auctionChannel.value) {
      subscribeToAuction();
    }
  },
);

watch(
  () => route.params.id,
  async () => {
    loading.value = true;
    error.value = "";
    activeImage.value = 0;
    await loadAuction();
  },
);

onMounted(async () => {
  clockTimer = setInterval(() => {
    clock.value = Date.now();
  }, 1000);
  await loadAuction();
  await loadWallet();
  if (disposed) return;
  try {
    liveEnabled.value = (await walletService.config()).live_enabled !== false;
  } catch {
    liveEnabled.value = false;
  }
  if (!qrPayment.value)
    qrPayment.value =
      wallet.value?.payments.find(
        (payment) =>
          payment.auction_id === auctionId.value ||
          payment.bid_auction_id === auctionId.value,
      ) || null;
  if (disposed) return;
  settlementTimer = setInterval(() => {
    if (isEnded.value && auction.value?.status !== "closed" && !document.hidden)
      loadAuction();
  }, 10000);
  if (isLive.value) subscribeToAuction();
});

onUnmounted(() => {
  disposed = true;
  qrController?.abort();
  clearInterval(clockTimer);
  clearInterval(settlementTimer);
  auctionService.unsubscribeFromAuction(auctionChannel.value);
});
</script>

<template>
  <UserLayout>
    <div class="page-container">
      <nav aria-label="Breadcrumb" class="mb-6">
        <ol class="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <li><router-link to="/" class="hover:text-heading">Home</router-link></li>
          <li aria-hidden="true">/</li>
          <li><router-link to="/auctions" class="hover:text-heading">Auctions</router-link></li>
          <li v-if="listing.categories?.name" aria-hidden="true">/</li>
          <li v-if="listing.categories?.name">
            <router-link
              :to="`/categories/${listing.categories.slug}`"
              class="hover:text-heading"
              >{{ listing.categories.name }}</router-link
            >
          </li>
          <li aria-hidden="true">/</li>
          <li class="max-w-[240px] truncate text-body" aria-current="page">
            {{ listing.title || "Lot" }}
          </li>
        </ol>
      </nav>

      <div v-if="loading" class="grid gap-8 lg:grid-cols-[1.55fr_1fr]">
        <BaseSkeleton type="card" />
        <div class="space-y-4">
          <BaseSkeleton :lines="4" />
          <BaseSkeleton :lines="3" />
        </div>
      </div>

      <div
        v-else-if="error"
        role="alert"
        class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        {{ error }}
        <BaseButton variant="outline" size="sm" class="ml-3" @click="loadAuction">
          Retry
        </BaseButton>
      </div>

      <template v-else-if="auction">
        <div class="grid gap-8 lg:grid-cols-[1.55fr_1fr] lg:gap-10">
          <!-- Left: gallery and lot information. On mobile the wrapper becomes
               display:contents so the bidding panel can sit directly after the
               lot header, before the longer details and bid history. -->
          <div class="contents lg:block lg:min-w-0 lg:space-y-8">
            <div class="order-1">
              <div
                class="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-100 to-slate-200"
              >
                <img
                  v-if="imageUrl"
                  :src="imageUrl"
                  :alt="listing.title"
                  class="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
                <div v-else class="grid h-full w-full place-items-center">
                  <svg
                    class="h-16 w-16 text-navy-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div class="absolute left-3 top-3">
                  <AuctionStatusBadge :state="state" />
                </div>
              </div>

              <div v-if="images.length > 1" class="mt-3 flex gap-2 overflow-x-auto pb-1">
                <button
                  v-for="(image, index) in images"
                  :key="image"
                  type="button"
                  :class="[
                    'h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                    index === activeImage
                      ? 'border-navy-700'
                      : 'border-transparent hover:border-navy-200',
                  ]"
                  :aria-label="`View image ${index + 1}`"
                  :aria-pressed="index === activeImage"
                  @click="activeImage = index"
                >
                  <img
                    :src="image"
                    :alt="`${listing.title} — image ${index + 1}`"
                    class="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              </div>
            </div>

            <header class="order-2">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span v-if="listing.categories?.name">{{
                  listing.categories.name
                }}</span>
                <span v-if="listing.categories?.name" aria-hidden="true">·</span>
                <span>Condition: {{ conditionLabel }}</span>
                <span aria-hidden="true">·</span>
                <span>Listed by {{ seller.display_name || "CamboBid seller" }}</span>
              </div>
              <h1 class="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.025em] text-heading sm:text-4xl">
                {{ listing.title }}
              </h1>
            </header>

            <section aria-labelledby="about-lot" class="order-4">
              <h2 id="about-lot" class="font-display text-xl font-semibold text-heading">
                About this lot
              </h2>
              <p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-body sm:text-[15px]">
                {{ listing.description || "No description has been provided for this lot." }}
              </p>
            </section>

            <section aria-labelledby="lot-details" class="order-5">
              <h2 id="lot-details" class="font-display text-xl font-semibold text-heading">
                Lot details
              </h2>
              <dl class="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 border-y border-border py-5 sm:grid-cols-2">
                <div class="flex items-baseline justify-between gap-4">
                  <dt class="text-sm text-muted">Category</dt>
                  <dd class="text-sm font-medium text-heading">
                    {{ listing.categories?.name || "—" }}
                  </dd>
                </div>
                <div class="flex items-baseline justify-between gap-4">
                  <dt class="text-sm text-muted">Condition</dt>
                  <dd class="text-sm font-medium text-heading">{{ conditionLabel }}</dd>
                </div>
                <div class="flex items-baseline justify-between gap-4">
                  <dt class="text-sm text-muted">Starting price</dt>
                  <dd class="numeric text-sm font-medium text-heading">
                    {{ formatUSD(listing.starting_price) }}
                  </dd>
                </div>
                <div class="flex items-baseline justify-between gap-4">
                  <dt class="text-sm text-muted">Bid increment</dt>
                  <dd class="numeric text-sm font-medium text-heading">
                    {{ formatUSD(auction.bid_increment) }}
                  </dd>
                </div>
                <div class="flex items-baseline justify-between gap-4">
                  <dt class="text-sm text-muted">Reserve</dt>
                  <dd class="text-sm font-medium text-heading">{{ reserveLabel }}</dd>
                </div>
                <div class="flex items-baseline justify-between gap-4">
                  <dt class="text-sm text-muted">Auction type</dt>
                  <dd class="text-sm font-medium text-heading">{{ typeLabel }}</dd>
                </div>
                <div class="flex items-baseline justify-between gap-4">
                  <dt class="text-sm text-muted">Opens</dt>
                  <dd class="text-sm font-medium text-heading">
                    {{ formatDateTime(auction.start_time) }}
                  </dd>
                </div>
                <div class="flex items-baseline justify-between gap-4">
                  <dt class="text-sm text-muted">Closes</dt>
                  <dd class="text-sm font-medium text-heading">
                    {{ formatDateTime(auction.end_time) }}
                  </dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="bid-history" class="order-6">
              <div class="flex items-end justify-between gap-4">
                <div>
                  <h2 id="bid-history" class="font-display text-xl font-semibold text-heading">
                    Bid history
                  </h2>
                  <p class="mt-1 text-sm text-muted">
                    {{ bidCount }} {{ bidCount === 1 ? "bid" : "bids" }} recorded
                  </p>
                </div>
              </div>

              <div
                v-if="bids.length === 0"
                class="mt-4 rounded-xl border border-dashed border-line bg-white px-5 py-8 text-center text-sm text-muted"
              >
                No bids yet. The opening bid is
                {{ formatUSD(listing.starting_price) }}.
              </div>

              <div v-else class="mt-4 overflow-x-auto rounded-xl border border-border">
                <table class="min-w-full divide-y divide-border">
                  <thead class="bg-surface">
                    <tr>
                      <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-body">Bidder</th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-semibold text-body">Amount</th>
                      <th scope="col" class="hidden px-4 py-3 text-right text-xs font-semibold text-body sm:table-cell">Type</th>
                      <th scope="col" class="px-4 py-3 text-right text-xs font-semibold text-body">Time</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border bg-white">
                    <tr v-for="bid in bids" :key="bid.id">
                      <td class="whitespace-nowrap px-4 py-3 text-sm text-body">
                        {{ bid.bidder?.display_name || "Bidder" }}
                      </td>
                      <td class="numeric whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-heading">
                        {{ formatUSD(bid.amount) }}
                      </td>
                      <td class="hidden whitespace-nowrap px-4 py-3 text-right text-xs text-muted sm:table-cell">
                        {{ bid.is_proxy ? "Proxy" : "Standard" }}
                      </td>
                      <td class="whitespace-nowrap px-4 py-3 text-right text-xs text-muted">
                        {{ formatDateTime(bid.placed_at) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <!-- Right: bidding panel. On mobile it moves up to just after the lot
               header via the order utility. -->
          <aside class="order-3 min-w-0 lg:order-none">
            <div class="space-y-4 lg:sticky lg:top-24">
              <div class="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
                <div class="flex items-center justify-between gap-3">
                  <AuctionStatusBadge :state="state" />
                  <span class="text-xs text-muted">
                    {{ bidCount }} {{ bidCount === 1 ? "bid" : "bids" }}
                  </span>
                </div>

                <div class="mt-5">
                  <PriceDisplay
                    :amount="auction.current_price"
                    :label="state.priceLabel"
                    size="xl"
                  />
                </div>

                <div class="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
                  <div>
                    <p class="meta-label">
                      {{ isScheduled ? "Bidding opens" : isEnded ? "Closed" : "Time remaining" }}
                    </p>
                    <CountdownTimer
                      v-if="isLive"
                      :end-time="auction.end_time"
                      :status="auction.status"
                      size="md"
                      class="mt-1"
                    />
                    <p v-else-if="isScheduled" class="mt-1 text-sm font-medium text-heading">
                      {{ formatDateTime(auction.start_time) }}
                    </p>
                    <p v-else class="mt-1 text-sm font-medium text-heading">
                      {{ formatDateTime(auction.end_time) }}
                    </p>
                  </div>
                  <div v-if="isLive" class="text-right">
                    <p class="meta-label">Next minimum</p>
                    <p class="numeric mt-1 text-base font-semibold text-heading">
                      {{ formatUSD(minBid) }}
                    </p>
                  </div>
                </div>

                <!-- Seller notice -->
                <div
                  v-if="isSeller"
                  class="mt-5 rounded-xl border border-border bg-surface p-4 text-sm"
                >
                  <p class="font-semibold text-heading">This is your listing</p>
                  <p class="mt-1 text-body">You cannot bid on or buy your own item.</p>
                  <p v-if="buyNowPrice > 0" class="mt-2 text-body">
                    Buy Now price:
                    <span class="numeric font-semibold text-heading">{{ formatUSD(buyNowPrice) }}</span>
                  </p>
                  <router-link
                    to="/seller/listings"
                    class="mt-3 inline-block text-sm font-semibold text-navy-700 hover:text-navy-900"
                  >
                    Manage your listings
                  </router-link>
                </div>

                <!-- Bidding form -->
                <form
                  v-if="isLive && isAuthenticated && !isSeller"
                  class="mt-5 space-y-3"
                  @submit.prevent="placeBid"
                >
                  <div
                    v-if="bidError"
                    role="alert"
                    class="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                  >
                    {{ bidError }}
                  </div>
                  <div
                    v-if="bidSuccess"
                    role="status"
                    class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
                  >
                    {{ bidSuccess }}
                  </div>

                  <BaseInput
                    v-model="bidAmount"
                    label="Your bid"
                    type="number"
                    :placeholder="`Minimum ${formatUSD(minBid)}`"
                    :min="minBid"
                    step="0.01"
                    required
                    :hint="`The next valid bid is ${formatUSD(minBid)}.`"
                  />

                  <label class="flex cursor-pointer items-center gap-2 text-sm text-body">
                    <input
                      v-model="isProxy"
                      type="checkbox"
                      class="h-4 w-4 rounded border-line text-navy-800 focus:ring-navy-500"
                    />
                    Set a hidden maximum (proxy bid)
                  </label>

                  <BaseInput
                    v-if="isProxy"
                    v-model="proxyMax"
                    label="Maximum bid"
                    type="number"
                    placeholder="Maximum amount"
                    :min="minBid"
                    step="0.01"
                    hint="The platform bids on your behalf up to this amount."
                  />

                  <BaseButton type="submit" variant="gold" :loading="bidding" :disabled="buying" class="w-full">
                    Place bid · {{ formatUSD(bidAmount || minBid) }}
                  </BaseButton>
                  <BaseButton
                    v-if="auction.payment_mode === 'live'"
                    type="button"
                    variant="outline"
                    :disabled="qrBusy || bidding || buying || isProxy || !liveEnabled"
                    class="w-full"
                    @click="startQr('bid')"
                  >
                    Bid with KHQR
                  </BaseButton>
                  <p v-if="auction.payment_mode === 'live'" class="text-xs leading-5 text-muted">
                    Wallet bids are confirmed immediately. KHQR bids wait for
                    bank verification, so the minimum may change. Proxy bids use
                    wallet funds.
                  </p>
                  <p v-if="!isVerifiedBidder" class="text-xs leading-5 text-muted">
                    <router-link to="/verify-identity" class="font-semibold text-navy-700 hover:text-navy-900">
                      Verify your identity
                    </router-link>
                    to bid in higher-value auctions.
                  </p>
                </form>

                <div v-else-if="isLive && !isAuthenticated" class="mt-5">
                  <router-link
                    to="/login"
                    class="inline-flex w-full items-center justify-center rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700"
                  >
                    Sign in to bid
                  </router-link>
                  <p class="mt-2 text-center text-xs text-muted">
                    New to CamboBid?
                    <router-link to="/register" class="font-semibold text-navy-700">Create an account</router-link>
                  </p>
                </div>

                <div v-else-if="isScheduled" class="mt-5 rounded-xl border border-navy-100 bg-navy-50 p-4 text-sm">
                  <p class="font-semibold text-navy-900">Bidding has not opened</p>
                  <p class="mt-1 leading-6 text-navy-800">
                    This lot opens on {{ formatDateTime(auction.start_time) }}.
                    You can review the details now and return when bidding starts.
                  </p>
                </div>

                <!-- Buy Now -->
                <div
                  v-if="canBuyNow && !isSeller"
                  class="mt-5 rounded-xl border border-gold-200 bg-gold-50 p-4"
                >
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-sm font-semibold text-heading">Buy Now</p>
                    <p class="numeric text-lg font-semibold text-heading">{{ formatUSD(buyNowPrice) }}</p>
                  </div>
                  <p class="mt-2 text-xs leading-5 text-body">
                    Purchase immediately with {{ auction.payment_mode || "demo" }}
                    wallet funds. Payment stays held until delivery is confirmed.
                  </p>
                  <BaseButton class="mt-3 w-full" :loading="buying" :disabled="bidding" @click="buyNow">
                    {{ isAuthenticated ? `Buy now · ${formatUSD(buyNowPrice)}` : "Sign in to buy now" }}
                  </BaseButton>
                  <BaseButton
                    v-if="auction.payment_mode === 'live'"
                    type="button"
                    variant="outline"
                    class="mt-2 w-full"
                    :disabled="qrBusy || bidding || buying || !liveEnabled"
                    @click="buyWithQr"
                  >
                    Buy with KHQR · {{ formatUSD(buyNowPrice) }}
                  </BaseButton>
                </div>

                <p v-if="purchaseError && !isSeller" role="alert" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  {{ purchaseError }}
                </p>

                <!-- Wallet summary -->
                <div
                  v-if="isAuthenticated && !isSeller"
                  class="mt-5 rounded-xl border border-border bg-surface p-4 text-sm"
                >
                  <p class="font-semibold text-heading">
                    {{ auction.payment_mode || "demo" }} wallet
                  </p>
                  <div class="mt-2 flex items-center justify-between gap-3 text-body">
                    <span>Available</span>
                    <span class="numeric font-semibold text-heading">
                      {{ formatUSD(auctionWallet.available / 100) }}
                    </span>
                  </div>
                  <div class="mt-1 flex items-center justify-between gap-3 text-body">
                    <span>Reserved</span>
                    <span class="numeric font-semibold text-heading">
                      {{ formatUSD(auctionWallet.reserved / 100) }}
                    </span>
                  </div>
                  <p class="mt-2 text-xs leading-5 text-muted">
                    Proxy bids reserve your maximum until the auction closes.
                  </p>
                  <div class="mt-2 flex gap-3 text-xs font-semibold text-navy-700">
                    <router-link to="/wallet" class="hover:text-navy-900">Top up wallet</router-link>
                    <router-link to="/account/security" class="hover:text-navy-900">Security checklist</router-link>
                  </div>
                </div>

                <!-- Ended states -->
                <section
                  v-if="isEnded && settledOrder && user?.id === settledOrder.buyer_id"
                  class="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                  role="status"
                >
                  <h2 class="font-display text-lg font-semibold text-emerald-900">
                    {{ settledOrder.purchase_kind === "buy_now" ? "Congratulations — it's yours" : "Congratulations — you won" }}
                  </h2>
                  <p class="mt-1.5 text-sm leading-6 text-emerald-900">
                    {{ settledOrder.status === "pending" ? "Your winning order is ready. Complete payment to continue." : "Your order is ready. Open it for payment and delivery details." }}
                  </p>
                  <router-link :to="'/orders/' + settledOrder.id" class="mt-3 inline-block text-sm font-semibold text-emerald-900 underline">
                    View your order
                  </router-link>
                </section>
                <section
                  v-else-if="isEnded && settledOrder && isSeller"
                  class="mt-5 rounded-xl border border-navy-100 bg-navy-50 p-4 text-sm text-navy-900"
                >
                  <p class="leading-6">
                    {{ settledOrder.status === "released" ? "Sale proceeds have been credited to your wallet." : settledOrder.status === "held" ? "Your item sold. Payment is held until the buyer confirms delivery." : "View the order for payment and settlement details." }}
                  </p>
                  <router-link :to="'/orders/' + settledOrder.id" class="mt-2 inline-block font-semibold underline">
                    View sale
                  </router-link>
                </section>
                <p
                  v-else-if="isEnded && auction.status !== 'closed'"
                  class="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
                >
                  Finalising the auction result. Funded auctions settle
                  automatically, normally within a minute. Payment stays held
                  until delivery is confirmed.
                </p>

                <InlineKhqr v-if="qrPayment" :payment="qrPayment" class="mt-4" @updated="qrUpdated" />

                <p v-if="!liveEnabled && auction.payment_mode === 'live'" class="mt-4 text-xs leading-5 text-amber-800">
                  New real payments are paused. Existing QR receipts can still be
                  checked.
                </p>
              </div>

              <div class="rounded-xl border border-border bg-white p-4 text-xs leading-5 text-muted">
                <p class="font-semibold text-heading">How payment works</p>
                <p class="mt-1.5">
                  Winning payments are held by CamboBid and released to the
                  seller after you confirm delivery. If something is wrong,
                  open a dispute from your order.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </template>
    </div>
  </UserLayout>
</template>
