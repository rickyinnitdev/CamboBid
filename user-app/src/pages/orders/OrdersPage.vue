<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import UserLayout from "@/components/layout/UserLayout.vue";
import KhmerDivider from "@/components/base/KhmerDivider.vue";
import StatusBadge from "@/components/auction/StatusBadge.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import { orderService } from "@/services/orderService";
import { formatDateTime, formatUSD } from "@/utils/format";
const route = useRoute(),
  router = useRouter(),
  orders = ref([]),
  sales = ref([]),
  pending = ref([]),
  loading = ref(true),
  error = ref("");
const tab = computed(() =>
  ["wins", "buy_now", "sales"].includes(route.query.tab)
    ? route.query.tab
    : "all",
);
const tabs = computed(() => [
  { id: "all", name: "All purchases", count: orders.value.length },
  {
    id: "wins",
    name: "Auction wins",
    count: orders.value.filter((o) => o.purchase_kind !== "buy_now").length,
  },
  {
    id: "buy_now",
    name: "Buy Now",
    count: orders.value.filter((o) => o.purchase_kind === "buy_now").length,
  },
  { id: "sales", name: "My sales", count: sales.value.length },
]);
const visible = computed(() =>
  tab.value === "sales"
    ? sales.value
    : orders.value.filter(
        (o) =>
          tab.value === "all" ||
          (tab.value === "buy_now"
            ? o.purchase_kind === "buy_now"
            : o.purchase_kind !== "buy_now"),
      ),
);
let timer,
  busy = false;
async function load() {
  if (busy) return;
  busy = true;
  try {
    [orders.value, sales.value, pending.value] = await Promise.all([
      orderService.getMyOrders(),
      orderService.getAsSellerOrders(),
      orderService.getPendingWins(),
    ]);
    error.value = "";
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
    busy = false;
  }
}
onMounted(() => {
  load();
  timer = setInterval(() => {
    if (!document.hidden) load();
  }, 15000);
});
onUnmounted(() => clearInterval(timer));
const money = (n) => formatUSD(n);
function image(o) {
  const img = o.auctions?.listings?.images?.[0];
  return typeof img === "string" ? img : img?.url;
}
function note(o) {
  if (o.status === "held" && o.funded_at)
    return tab.value === "sales"
      ? "Payment held — released to your wallet after buyer confirms delivery."
      : "Payment confirmed and held safely. Confirm delivery only after receiving your item.";
  if (o.status === "released")
    return tab.value === "sales"
      ? "Sale proceeds credited to your wallet."
      : "Delivery confirmed; payment released to the seller.";
  if (o.status === "pending")
    return "Payment is required before this order is funded.";
  if (o.status === "refunded") return "Payment refunded to the buyer’s wallet.";
  if (o.status === "frozen")
    return "Payment is frozen while the dispute is reviewed.";
  return "Open the order for its payment and delivery details.";
}
</script>
<template>
  <UserLayout>
    <main class="page-container max-w-5xl space-y-6">
      <KhmerDivider />
      <div class="page-header">
        <div>
          <p class="kicker">Your collection</p>
          <h1 class="page-title mt-3">Wins &amp; purchases</h1>
          <p class="page-subtitle mt-3">
            Your winning auctions, instant purchases and sales, all in one
            place.
          </p>
        </div>
        <router-link to="/wallet" class="btn-outline btn-sm self-start sm:self-auto">
          Your wallet
        </router-link>
      </div>

      <div class="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Order views">
        <button
          v-for="t in tabs"
          :key="t.id"
          role="tab"
          :aria-selected="tab === t.id"
          class="inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors"
          :class="
            tab === t.id
              ? 'border-navy-900 bg-navy-900 text-white'
              : 'border-border bg-white text-body hover:border-navy-300 hover:text-heading'
          "
          @click="router.replace({ query: { tab: t.id } })"
        >
          {{ t.name }}
          <span
            class="rounded-full px-1.5 py-0.5 text-[11px]"
            :class="tab === t.id ? 'bg-white/15 text-white' : 'bg-surface text-muted'"
          >
            {{ t.count }}
          </span>
        </button>
      </div>

      <div
        v-if="error"
        role="alert"
        class="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger"
      >
        {{ error }}
      </div>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-32 animate-pulse rounded-2xl border border-border bg-white" />
      </div>

      <template v-else>
        <section
          v-if="pending.length && ['all', 'wins'].includes(tab)"
          class="rounded-2xl border border-gold-200 bg-gold-50 p-5"
        >
          <h2 class="font-display text-base font-semibold text-gold-900">
            Finalizing your auction results
          </h2>
          <p class="mt-1.5 text-sm leading-6 text-gold-900">
            The timer has ended. Automatic settlement normally creates the order
            within a minute; your bid funds stay reserved until then.
          </p>
          <router-link
            v-for="p in pending"
            :key="p.id"
            :to="'/auctions/' + p.id"
            class="mt-3 flex justify-between gap-3 border-t border-gold-200 pt-3 text-sm font-medium text-gold-900 underline"
          >
            <span>{{ p.listings?.title }}</span>
            <span class="shrink-0">{{ money(p.current_price) }} · {{ p.payment_mode }}</span>
          </router-link>
        </section>

        <BaseEmptyState
          v-if="!visible.length"
          :title="tab === 'sales' ? 'No sales yet' : 'No purchases yet'"
          :description="
            tab === 'sales'
              ? 'Your sales and their delivery/payment status will appear here.'
              : 'Win an auction or use Buy Now to start your collection.'
          "
          icon="package"
        >
          <template #action>
            <router-link to="/auctions" class="btn-primary btn-sm mt-5">
              Browse auctions
            </router-link>
          </template>
        </BaseEmptyState>

        <div v-else class="space-y-3">
          <router-link
            v-for="o in visible"
            :key="o.id"
            :to="'/orders/' + o.id"
            class="group block rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-md"
          >
            <div class="flex gap-4">
              <div class="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface">
                <img
                  v-if="image(o)"
                  :src="image(o)"
                  :alt="o.auctions?.listings?.title"
                  class="h-full w-full object-cover"
                />
                <div v-else class="grid h-full w-full place-items-center">
                  <svg class="h-6 w-6 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>

              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-medium uppercase tracking-wider text-muted">
                  {{
                    tab === "sales"
                      ? "Your sale"
                      : o.purchase_kind === "buy_now"
                        ? "Buy Now purchase"
                        : "Auction won"
                  }}
                  · {{ o.payment_mode || "demo" }}
                </p>
                <h2 class="mt-1 truncate font-display text-base font-semibold text-heading">
                  {{ o.auctions?.listings?.title || "Auction item" }}
                </h2>
                <p class="mt-1.5 text-xs text-muted">
                  {{ formatDateTime(o.created_at) }}
                </p>
              </div>

              <div class="shrink-0 text-right">
                <p class="numeric font-display text-lg font-semibold text-heading">
                  {{ money(o.amount) }}
                </p>
                <StatusBadge :status="o.status" type="escrow" class="mt-1.5" />
              </div>
            </div>

            <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
              <p class="text-sm leading-6 text-body">{{ note(o) }}</p>
              <span class="shrink-0 text-sm font-semibold text-navy-700 transition-colors group-hover:text-navy-900">
                View order &rarr;
              </span>
            </div>
          </router-link>
        </div>
      </template>
    </main>
  </UserLayout>
</template>
