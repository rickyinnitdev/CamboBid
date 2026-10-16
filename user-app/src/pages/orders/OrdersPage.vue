<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import UserLayout from "@/components/layout/UserLayout.vue";
import StatusBadge from "@/components/auction/StatusBadge.vue";
import { orderService } from "@/services/orderService";
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
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n),
  );
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
  <UserLayout
    ><main class="page-container max-w-5xl space-y-6">
      <div class="page-header">
        <div>
          <p class="section-eyebrow">Your collection</p>
          <h1 class="page-title">Wins &amp; purchases</h1>
          <p class="page-subtitle">
            Your winning auctions, instant purchases and sales, all in one
            place.
          </p>
        </div>
        <router-link to="/wallet" class="text-sm text-teal-800 underline"
          >Your wallet ↗</router-link
        >
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="t in tabs"
          :key="t.id"
          class="px-4 py-3 rounded-xl text-sm border"
          :class="
            tab === t.id
              ? 'bg-teal-800 text-white border-teal-800'
              : 'bg-white text-slate-600 border-slate-200'
          "
          @click="router.replace({ query: { tab: t.id } })"
        >
          {{ t.name }} <span class="ml-2 opacity-60">{{ t.count }}</span>
        </button>
      </div>
      <p
        v-if="error"
        role="alert"
        class="p-4 rounded-xl bg-red-50 text-red-700"
      >
        {{ error }}
      </p>
      <p v-if="loading" class="p-8 text-slate-400">Loading your orders…</p>
      <template v-else
        ><section
          v-if="pending.length && ['all', 'wins'].includes(tab)"
          class="p-5 rounded-2xl bg-amber-50 border border-amber-100"
        >
          <h2 class="font-semibold">Finalizing your auction results</h2>
          <p class="text-sm text-amber-900 mt-2">
            The timer has ended. Automatic settlement normally creates the order
            within a minute; your bid funds stay reserved until then.
          </p>
          <router-link
            v-for="p in pending"
            :key="p.id"
            :to="'/auctions/' + p.id"
            class="flex justify-between gap-3 mt-4 text-sm underline"
            ><span>{{ p.listings?.title }}</span
            ><span
              >{{ money(p.current_price) }} · {{ p.payment_mode }}</span
            ></router-link
          >
        </section>
        <p
          v-if="!visible.length"
          class="bg-white border rounded-2xl p-8 text-slate-500"
        >
          {{
            tab === "sales"
              ? "Your sales and their delivery/payment status will appear here."
              : "No matching purchases yet. Win an auction or use Buy Now to start your collection."
          }}
        </p>
        <router-link
          v-for="o in visible"
          :key="o.id"
          :to="'/orders/' + o.id"
          class="block bg-white border border-slate-200 rounded-2xl p-5 hover:border-teal-400 transition"
          ><div class="flex gap-4">
            <div
              class="w-20 h-20 shrink-0 rounded-xl bg-slate-100 overflow-hidden"
            >
              <img
                v-if="image(o)"
                :src="image(o)"
                :alt="o.auctions?.listings?.title"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs uppercase tracking-wider text-teal-700">
                {{
                  tab === "sales"
                    ? "Your sale"
                    : o.purchase_kind === "buy_now"
                      ? "Buy Now purchase"
                      : "Auction won"
                }}
                · {{ o.payment_mode || "demo" }}
              </p>
              <h2 class="font-semibold mt-1">
                {{ o.auctions?.listings?.title || "Auction item" }}
              </h2>
              <p class="text-xs text-slate-400 mt-2">
                {{ new Date(o.created_at).toLocaleString() }}
              </p>
            </div>
            <div class="text-right">
              <p class="font-bold">{{ money(o.amount) }}</p>
              <StatusBadge :status="o.status" type="escrow" class="mt-2" />
            </div>
          </div>
          <p class="mt-4 pt-4 border-t text-sm text-slate-500">{{ note(o) }}</p>
          <p class="mt-3 text-sm font-medium text-teal-800">
            View order, invoice &amp; delivery details →
          </p></router-link
        ></template
      >
    </main></UserLayout
  >
</template>
