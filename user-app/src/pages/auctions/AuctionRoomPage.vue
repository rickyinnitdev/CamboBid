<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "@/composables/useAuth";
import { orderService } from "@/services/orderService";
import { auctionService } from "@/services/auctionService";
import { walletService } from "@/services/walletService";
import { bidService } from "@/services/bidService";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseBadge from "@/components/base/BaseBadge.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import InlineKhqr from "@/components/auction/InlineKhqr.vue";
import CountdownTimer from "@/components/auction/CountdownTimer.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { user, isAuthenticated, isVerifiedBidder } = useAuth();

const wallet = ref(null);
async function loadWallet() {
  if (isAuthenticated.value) {
    try {
      wallet.value = await walletService.overview();
    } catch {
      wallet.value = null;
    }
  }
}
const auctionWallet = computed(
  () =>
    wallet.value?.accounts.find(
      (w) => w.mode === (auction.value?.payment_mode || "demo"),
    ) || { available: 0, reserved: 0 },
);
const clock = ref(Date.now());
let clockTimer, settlementTimer;
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

const auctionId = computed(() => route.params.id);

const isEnded = computed(() => {
  const endTime = auction.value?.end_time
    ? new Date(auction.value.end_time).getTime()
    : NaN;
  return (
    auction.value?.status === "closed" ||
    (Number.isFinite(endTime) && endTime <= clock.value)
  );
});
const isLive = computed(
  () => !isEnded.value && ["live", "extended"].includes(auction.value?.status),
);
const isScheduled = computed(() => auction.value?.status === "scheduled");

const listing = computed(() => auction.value?.listings || {});
const seller = computed(() => listing.value.seller || {});
const isSeller = computed(
  () => !!user.value?.id && user.value.id === listing.value.seller_id,
);
const buyNowPrice = computed(() => Number(listing.value.buy_it_now_price || 0));
const canBuyNow = computed(
  () =>
    isLive.value &&
    buyNowPrice.value > 0 &&
    buyNowPrice.value >= Number(auction.value?.current_price || 0) &&
    buyNowPrice.value >= Number(listing.value.reserve_price || 0),
);
const buying = ref(false),
  purchaseError = ref("");
const qrPayment = ref(null),
  qrBusy = ref(false),
  liveEnabled = ref(true);
let qrController,
  disposed = false;
async function startQr(kind) {
  if (isSeller.value || !isLive.value || qrBusy.value) return;
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
  if (isSeller.value) {
    purchaseError.value = "You cannot buy your own item";
    return;
  }
  if (!isAuthenticated.value) {
    await router.push({ name: "Login", query: { redirect: route.fullPath } });
    return;
  }
  if (!canBuyNow.value || buying.value || bidding.value) return;
  const amount = buyNowPrice.value.toFixed(2),
    mode = auction.value.payment_mode || "demo";
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

const minBid = computed(() => {
  const current = Number(auction.value?.current_price || 0);
  const increment = Number(auction.value?.bid_increment || 1);
  return (
    Math.round((current + (auction.value?.winner_id ? increment : 0)) * 100) /
    100
  );
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
  if (isSeller.value) {
    bidError.value = "You cannot bid on your own item";
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
  if (auctionChannel.value) return;
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
        (p) =>
          p.auction_id === auctionId.value ||
          p.bid_auction_id === auctionId.value,
      ) || null;
  if (disposed) return;
  settlementTimer = setInterval(() => {
    if (isEnded.value && auction.value?.status !== "closed" && !document.hidden)
      loadAuction();
  }, 10000);
  if (isLive.value) {
    subscribeToAuction();
  }
});

onUnmounted(() => {
  disposed = true;
  qrController?.abort();
  clearInterval(clockTimer);
  clearInterval(settlementTimer);
  auctionService.unsubscribeFromAuction(auctionChannel.value);
});

watch(
  () => auction.value?.status,
  (newStatus) => {
    if (["live", "extended"].includes(newStatus) && !auctionChannel.value) {
      subscribeToAuction();
    }
  },
);
</script>

<template>
  <UserLayout>
    <div class="page-container max-w-6xl">
      <div v-if="loading" class="space-y-6">
        <BaseSkeleton type="card" />
      </div>

      <div
        v-else-if="error"
        class="p-4 rounded-lg bg-danger/10 text-danger text-sm"
      >
        {{ error }}
        <BaseButton
          variant="outline"
          size="sm"
          class="ml-4"
          @click="loadAuction"
          >Retry</BaseButton
        >
      </div>

      <template v-else-if="auction">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Left: Images & Details -->
          <div class="lg:col-span-2 space-y-6">
            <div class="aspect-[4/3] bg-surface rounded-xl overflow-hidden">
              <img
                v-if="imageUrl"
                :src="imageUrl"
                :alt="listing.title"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center"
              >
                <svg
                  class="w-16 h-16 text-muted/30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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

            <BaseCard>
              <div class="p-6">
                <div class="flex items-start justify-between mb-4">
                  <div>
                    <h1 class="text-2xl font-bold text-heading">
                      {{ listing.title }}
                    </h1>
                    <div
                      class="flex items-center gap-2 mt-2 text-sm text-muted"
                    >
                      <span v-if="listing.categories?.name">{{
                        listing.categories.name
                      }}</span>
                      <span v-if="listing.condition"
                        >• {{ listing.condition }}</span
                      >
                      <span>• Listed by {{ seller.display_name }}</span>
                    </div>
                  </div>
                  <BaseBadge v-if="isLive" variant="live" pulse>{{
                    t("auction.live")
                  }}</BaseBadge>
                  <BaseBadge v-else-if="isEnded" variant="default"
                    >Ended</BaseBadge
                  >
                  <BaseBadge v-else-if="isScheduled" variant="info"
                    >Upcoming</BaseBadge
                  >
                </div>
                <p class="text-sm text-body whitespace-pre-wrap">
                  {{ listing.description }}
                </p>
              </div>
            </BaseCard>

            <!-- Bid History -->
            <BaseCard>
              <div class="p-6">
                <h2 class="text-lg font-semibold text-heading mb-4">
                  {{ t("auction.bid_history") }}
                </h2>
                <div
                  v-if="bids.length === 0"
                  class="text-sm text-muted py-4 text-center"
                >
                  {{ t("auction.no_bids") }}
                </div>
                <div v-else class="space-y-3 max-h-80 overflow-y-auto">
                  <div
                    v-for="bid in bids"
                    :key="bid.id"
                    class="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div class="flex items-center gap-2">
                      <div
                        class="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center"
                      >
                        <span class="text-xs font-semibold text-white">
                          {{
                            (bid.bidder?.display_name || "U")
                              .charAt(0)
                              .toUpperCase()
                          }}
                        </span>
                      </div>
                      <div>
                        <p class="text-sm font-medium text-heading">
                          {{ bid.bidder?.display_name || "Anonymous" }}
                        </p>
                        <p class="text-xs text-muted">
                          {{ new Date(bid.placed_at).toLocaleString() }}
                        </p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="font-bold font-mono text-gold-600">
                        ${{ Number(bid.amount).toLocaleString() }}
                      </p>
                      <p v-if="bid.is_proxy" class="text-xs text-muted">
                        Proxy
                      </p>
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
                  <p class="text-sm text-muted mb-1">
                    {{ t("auction.current_price") }}
                  </p>
                  <p class="text-3xl font-bold font-mono text-gold-600">
                    ${{ Number(auction.current_price || 0).toLocaleString() }}
                  </p>
                </div>

                <CountdownTimer
                  v-if="isLive"
                  :end-time="auction.end_time"
                  :status="auction.status"
                />
                <div
                  v-else-if="isScheduled"
                  class="text-center text-sm text-muted"
                >
                  Starts {{ new Date(auction.start_time).toLocaleString() }}
                </div>
                <div v-else-if="isEnded" class="text-center text-sm text-muted">
                  {{ t("auction.ended") }}
                </div>

                <section
                  v-if="
                    isEnded &&
                    settledOrder &&
                    user?.id === settledOrder.buyer_id
                  "
                  class="rounded-xl bg-teal-50 border border-teal-100 p-4 space-y-3"
                  role="status"
                >
                  <h2 class="text-lg font-bold text-teal-900">
                    {{
                      settledOrder.purchase_kind === "buy_now"
                        ? "Congratulations — it’s yours!"
                        : "Congratulations — you won!"
                    }}
                  </h2>
                  <p class="text-sm">
                    {{
                      settledOrder.status === "pending"
                        ? "Your winning order is ready. Complete payment to continue."
                        : "Your order is ready. Open it for payment and delivery details."
                    }}
                  </p>
                  <router-link
                    :to="'/orders/' + settledOrder.id"
                    class="inline-block text-sm font-semibold text-teal-800 underline"
                    >View your order →</router-link
                  >
                </section>
                <section
                  v-else-if="isEnded && settledOrder && isSeller"
                  class="rounded-xl bg-blue-50 p-4 text-sm space-y-3"
                >
                  <p>
                    {{
                      settledOrder.status === "released"
                        ? "Sale proceeds have been credited to your wallet."
                        : settledOrder.status === "held"
                          ? "Your item sold. Payment is held until the buyer confirms delivery."
                          : "View the order for payment and settlement details."
                    }}
                  </p>
                  <router-link
                    :to="'/orders/' + settledOrder.id"
                    class="text-blue-800 underline"
                    >View sale →</router-link
                  >
                </section>
                <p
                  v-else-if="isEnded && auction.status !== 'closed'"
                  class="rounded-xl bg-amber-50 p-4 text-sm"
                >
                  Finalizing auction results. Funded auctions are settled
                  automatically, normally within a minute. Payments stay held
                  until delivery confirmation.
                </p>
                <div
                  v-if="isLive && !isSeller"
                  class="text-center text-xs text-muted"
                >
                  Min bid: ${{ minBid.toLocaleString() }}
                </div>

                <section
                  v-if="isAuthenticated && !isSeller"
                  class="rounded-xl bg-blue-50 p-3 text-sm space-y-2"
                >
                  <p class="font-bold">
                    {{ auction.payment_mode || "demo" }} funds · Available ${{
                      (auctionWallet.available / 100).toFixed(2)
                    }}
                  </p>
                  <p>
                    Reserved ${{ (auctionWallet.reserved / 100).toFixed(2) }} ·
                    Proxy bids reserve your maximum.
                  </p>
                  <div class="flex gap-3 text-blue-800 underline">
                    <router-link to="/wallet">Top up wallet</router-link
                    ><router-link to="/account/security"
                      >Security checklist</router-link
                    >
                  </div>
                </section>
                <section
                  v-if="isSeller"
                  class="rounded-xl bg-slate-50 p-4 text-sm space-y-3"
                >
                  <p class="font-semibold">This is your listing</p>
                  <p>You cannot bid on or buy your own item.</p>
                  <p v-if="buyNowPrice > 0">
                    Buy Now price: ${{ buyNowPrice.toFixed(2) }}
                  </p>
                  <router-link
                    to="/seller/listings"
                    class="inline-block underline text-blue-800"
                    >Manage your listings</router-link
                  >
                </section>
                <p
                  v-if="purchaseError && !isSeller"
                  role="alert"
                  class="text-sm text-red-700"
                >
                  {{ purchaseError }}
                </p>
                <section
                  v-if="canBuyNow && !isSeller"
                  class="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3"
                >
                  <div class="flex justify-between items-center">
                    <p class="font-semibold">Buy Now</p>
                    <p class="font-bold text-lg">
                      ${{ buyNowPrice.toFixed(2) }}
                    </p>
                  </div>
                  <p class="text-xs text-slate-600">
                    Purchase instantly with
                    {{ auction.payment_mode || "demo" }} wallet funds. Payment
                    stays held until delivery confirmation. Your bid reservation
                    on this item can count toward the purchase.
                  </p>
                  <BaseButton
                    class="w-full"
                    :loading="buying"
                    :disabled="bidding"
                    @click="buyNow"
                    >{{
                      isAuthenticated
                        ? "Buy Now · $" + buyNowPrice.toFixed(2)
                        : "Sign in to buy now"
                    }}</BaseButton
                  >
                  <BaseButton
                    v-if="auction.payment_mode === 'live'"
                    type="button"
                    variant="outline"
                    class="w-full"
                    :disabled="qrBusy || bidding || buying || !liveEnabled"
                    @click="buyWithQr"
                    >Buy with KHQR · ${{ buyNowPrice.toFixed(2) }}</BaseButton
                  >
                </section>
                <!-- Bid Form -->
                <form
                  v-if="isLive && isAuthenticated && !isSeller"
                  @submit.prevent="placeBid"
                  class="space-y-3"
                >
                  <div
                    v-if="bidError"
                    class="p-2 rounded bg-danger/10 text-danger text-xs"
                  >
                    {{ bidError }}
                  </div>
                  <div
                    v-if="bidSuccess"
                    class="p-2 rounded bg-success/10 text-success text-xs"
                  >
                    {{ bidSuccess }}
                  </div>

                  <BaseInput
                    v-model="bidAmount"
                    :label="t('auction.place_bid')"
                    type="number"
                    :placeholder="`Min $${minBid}`"
                    :min="minBid"
                    step="0.01"
                    required
                  />

                  <label
                    class="flex items-center gap-2 text-sm text-heading cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      v-model="isProxy"
                      class="rounded border-border"
                    />
                    {{ t("auction.proxy_bid") }}
                  </label>

                  <BaseInput
                    v-if="isProxy"
                    v-model="proxyMax"
                    :label="t('auction.proxy_bid_max')"
                    type="number"
                    placeholder="Maximum amount"
                    :min="minBid"
                    step="0.01"
                  />

                  <BaseButton
                    type="submit"
                    variant="gold"
                    :loading="bidding"
                    :disabled="buying"
                    class="w-full"
                  >
                    {{ t("auction.place_bid") }}
                  </BaseButton>
                  <BaseButton
                    v-if="auction.payment_mode === 'live'"
                    type="button"
                    variant="outline"
                    :disabled="
                      qrBusy || bidding || buying || isProxy || !liveEnabled
                    "
                    class="w-full"
                    @click="startQr('bid')"
                    >Bid with KHQR</BaseButton
                  >
                  <p
                    v-if="auction.payment_mode === 'live'"
                    class="text-xs text-muted"
                  >
                    Wallet bidding is instant. KHQR bidding waits for bank
                    verification; the minimum may change. Proxy bids use wallet
                    funds.
                  </p>
                </form>

                <div v-else-if="!isAuthenticated" class="text-center">
                  <router-link
                    to="/login"
                    class="text-sm font-medium text-navy-700 hover:text-navy-800"
                  >
                    Login to place a bid
                  </router-link>
                </div>
                <InlineKhqr
                  v-if="qrPayment"
                  :payment="qrPayment"
                  @updated="qrUpdated"
                />
                <p
                  v-if="!liveEnabled && auction.payment_mode === 'live'"
                  class="text-sm text-amber-800"
                >
                  New real payments are paused. Existing QR receipts can still
                  be checked.
                </p>
              </div>
            </BaseCard>
          </div>
        </div>
      </template>
    </div>
  </UserLayout>
</template>
