<script setup>
import WithdrawalPanel from "@/components/base/WithdrawalPanel.vue";
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import QRCode from "qrcode";
import UserLayout from "@/components/layout/UserLayout.vue";
import { walletService } from "@/services/walletService";
import { securityService } from "@/services/securityService";
import { orderService } from "@/services/orderService";
import { documentService } from "@/services/documentService";
const route = useRoute(),
  overview = ref({ accounts: [], ledger: [], payments: [] }),
  status = ref(null),
  documents = ref([]),
  sales = ref([]),
  amount = ref("0.01"),
  checkout = ref(null),
  qr = ref(""),
  error = ref(""),
  busy = ref(false),
  now = ref(Date.now()),
  mode = ref(null),
  activeMode = ref(null),
  ready = ref(false),
  liveEnabled = ref(true),
  retryAt = ref(0),
  search = ref("");
const account = computed(
  () =>
    overview.value.accounts.find((a) => a.mode === mode.value) || {
      available: 0,
      reserved: 0,
    },
);
const pendingEarnings = computed(() =>
  sales.value
    .filter(
      (o) =>
        o.payment_mode === mode.value &&
        o.funded_at &&
        ["held", "frozen"].includes(o.status),
    )
    .reduce((sum, o) => sum + Math.round(Number(o.amount) * 100), 0),
);
const eligible = computed(
  () =>
    status.value?.email_confirmed_at &&
    status.value?.identity_status === "approved" &&
    status.value?.session_verified &&
    status.value?.policies_current &&
    !status.value?.suspended,
);
const total = computed(
  () => Number(account.value.available) + Number(account.value.reserved),
);
const share = computed(() =>
  total.value
    ? Math.round((Number(account.value.available) / total.value) * 100)
    : 0,
);
const activity = computed(() =>
  overview.value.ledger.filter(
    (l) =>
      l.mode === mode.value &&
      l.reason.toLowerCase().includes(search.value.toLowerCase()),
  ),
);
const remaining = computed(
  () =>
    Math.max(
      0,
      Math.ceil((Date.parse(checkout.value?.expires_at) - now.value) / 1000),
    ) || 0,
);
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n) / 100,
  );
let timer,
  poll,
  disposed = false,
  paymentController;
function reloadWallet() {
  window.location.reload();
}
async function load() {
  const [wallet, security, docs, config, sellerOrders] = await Promise.all([
    walletService.overview(),
    securityService.status(),
    documentService.list(),
    walletService.config(),
    orderService.getAsSellerOrders(),
  ]);
  overview.value = wallet;
  status.value = security;
  documents.value = docs;
  activeMode.value = config.mode;
  liveEnabled.value = config.live_enabled !== false;
  sales.value = sellerOrders;
}
async function run(fn) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    await fn();
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function show(p) {
  checkout.value = p;
  mode.value = p.mode;
  qr.value = p.qr
    ? await QRCode.toDataURL(p.qr, { width: 280, margin: 2 })
    : "";
}
async function create() {
  await run(async () => {
    const cents = route.query.auction
      ? Number(route.query.quote)
      : Math.round(Number(amount.value) * 100);
    if (
      !route.query.order &&
      !route.query.auction &&
      (!Number.isFinite(Number(amount.value)) ||
        cents < 1 ||
        cents > 100000 ||
        Math.abs(Number(amount.value) * 100 - cents) > 0.00001)
    )
      throw new Error("Enter $0.01–$1,000 with at most two decimal places");
    await show(
      await walletService.create(
        cents,
        route.query.order || undefined,
        route.query.auction || undefined,
      ),
    );
    await load();
  });
}
async function check() {
  if (!checkout.value || busy.value) return;
  retryAt.value = Date.now() + 15000;
  await run(async () => {
    paymentController = new AbortController();
    const signal = AbortSignal.any([
      paymentController.signal,
      AbortSignal.timeout(35000),
    ]);
    const updated = await walletService.check(checkout.value.id, signal);
    if (disposed) return;
    await show(updated);
    await load();
  });
  if (error.value) retryAt.value = Date.now() + 30000;
}
async function simulate() {
  await run(async () => {
    await show(await walletService.simulate(checkout.value.id));
    await load();
  });
}
onMounted(async () => {
  await run(async () => {
    await load();
    mode.value = activeMode.value;
    const pending = overview.value.payments.find(
      (p) => p.mode === activeMode.value,
    );
    if (pending) await show(pending);
    ready.value = true;
  });
  if (disposed) return;
  timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
  poll = setInterval(() => {
    if (
      checkout.value?.mode === "live" &&
      checkout.value.status === "pending" &&
      now.value >= retryAt.value &&
      !document.hidden &&
      !busy.value
    )
      check();
  }, 15000);
});
onUnmounted(() => {
  disposed = true;
  paymentController?.abort();
  clearInterval(timer);
  clearInterval(poll);
});
</script>
<template>
  <UserLayout>
    <div v-if="!ready" class="page-container py-16" role="status">
      <p v-if="error" role="alert" class="text-sm text-danger">{{ error }}</p>
      <p v-else class="text-sm text-body">Loading your wallet and payment history…</p>
      <button v-if="error" class="btn-outline btn-sm mt-4" @click="reloadWallet">
        Reload wallet
      </button>
    </div>

    <main v-else class="page-container space-y-6">
      <div class="page-header">
        <div>
          <p class="kicker">CamboBid finance</p>
          <h1 class="page-title mt-3">Your wallet</h1>
          <p class="page-subtitle mt-3">
            Top up, follow your bids and keep every payment in view.
          </p>
        </div>
        <router-link to="/account/security" class="btn-outline btn-sm self-start sm:self-auto">
          Account security
        </router-link>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-2">
        <div class="flex gap-1" role="group" aria-label="Wallet environment">
          <button
            v-for="m in ['demo', 'live']"
            :key="m"
            class="rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            :class="
              mode === m
                ? 'bg-navy-900 text-white'
                : 'text-body hover:bg-surface hover:text-heading'
            "
            :aria-pressed="mode === m"
            @click="mode = m"
          >
            {{ m === "demo" ? "Demo wallet" : "Live wallet" }}
          </button>
        </div>
        <p class="px-2 text-xs text-muted">
          Checkout environment:
          <strong class="font-semibold uppercase text-heading">{{ activeMode }}</strong>
        </p>
      </div>

      <div
        v-if="error"
        role="alert"
        class="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger"
      >
        {{ error }}
        <span v-if="checkout?.status === 'pending'">
          Your checkout is saved. Verification will retry automatically; do not
          pay again.
        </span>
      </div>

      <div
        v-if="status && !eligible"
        class="rounded-xl border border-gold-200 bg-gold-50 p-4 text-sm leading-6 text-gold-900"
      >
        Complete email confirmation, ID approval, policy agreement and
        authenticator verification in
        <router-link to="/account/security" class="font-semibold underline">
          Account security</router-link
        >
        to top up or pay.
      </div>

      <section
        v-if="pendingEarnings > 0"
        class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-navy-100 bg-navy-50 p-5"
      >
        <div>
          <p class="font-semibold text-navy-900">
            Pending sale proceeds: {{ money(pendingEarnings) }}
          </p>
          <p class="mt-1.5 text-sm leading-6 text-navy-800">
            Held in escrow. These funds enter your available wallet after the
            buyer confirms delivery or staff resolves a dispute.
          </p>
        </div>
        <router-link
          to="/orders?tab=sales"
          class="text-sm font-semibold text-navy-700 underline hover:text-navy-900"
        >
          View my sales &rarr;
        </router-link>
      </section>

      <div class="grid gap-5 lg:grid-cols-5">
        <section class="surface-panel p-5 sm:p-6 lg:col-span-3">
          <div class="flex items-start justify-between gap-3">
            <h2 class="font-display text-lg font-semibold text-heading">
              CamboBid account
            </h2>
            <span class="text-[11px] font-medium uppercase tracking-wider text-muted">
              {{ mode }} · USD
            </span>
          </div>

          <div class="wallet-card mt-5">
            <div class="flex items-start justify-between gap-4">
              <span class="font-display text-lg font-semibold text-white">CamboBid</span>
              <span class="text-[10px] uppercase tracking-[0.18em] text-white/60">
                {{ mode === "live" ? "KHQR wallet" : "Demo wallet" }}
              </span>
            </div>
            <p class="mt-10 text-xs text-white/60">Available to bid</p>
            <p class="numeric mt-1.5 font-display text-4xl font-semibold text-white">
              {{ money(account.available) }}
            </p>
            <div class="mt-8 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-white/50">
              <span>Secure wallet</span>
              <span>USD / {{ mode?.toUpperCase() }}</span>
            </div>
          </div>

          <p class="mt-4 text-xs leading-5 text-muted">
            {{
              mode === "demo"
                ? "Demo funds have no cash value and never move bank money."
                : "Live balances reflect confirmed bank receipts. Request a withdrawal below; authorised staff transfer the funds to your bank account."
            }}
          </p>
        </section>

        <section class="surface-panel flex flex-col justify-center p-5 text-center sm:p-6 lg:col-span-2">
          <p class="text-xs font-medium uppercase tracking-wider text-muted">
            Your total balance
          </p>
          <p class="numeric mt-3 font-display text-4xl font-semibold text-heading">
            {{ money(total) }}
          </p>
          <p class="mt-2 text-xs text-muted">
            Available + reserved · {{ mode }} funds
          </p>

          <div class="mt-6 grid grid-cols-4 gap-1.5 rounded-xl bg-surface p-2">
            <a href="#withdrawals" class="wallet-action">
              <span class="wallet-action-icon" aria-hidden="true">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v12m0 0l4-4m-4 4l-4-4M5 20h14" />
                </svg>
              </span>
              Withdraw
            </a>
            <a href="#topup" class="wallet-action">
              <span class="wallet-action-icon" aria-hidden="true">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 20V8m0 0l4 4m-4-4l-4 4M5 4h14" />
                </svg>
              </span>
              Top up
            </a>
            <router-link to="/documents" class="wallet-action">
              <span class="wallet-action-icon" aria-hidden="true">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7h8M8 11h8M8 15h5m-8 6h14a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </span>
              Invoices
            </router-link>
            <router-link to="/orders" class="wallet-action">
              <span class="wallet-action-icon" aria-hidden="true">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </span>
              Orders
            </router-link>
          </div>
        </section>
      </div>

      <div class="grid gap-5 lg:grid-cols-5">
        <section class="surface-panel p-5 sm:p-6 lg:col-span-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="font-display text-lg font-semibold text-heading">
              Recent transactions
            </h2>
            <input
              v-model="search"
              aria-label="Search wallet activity"
              placeholder="Search activity…"
              class="input max-w-[200px] py-2 text-xs"
            />
          </div>
          <p class="mt-2 text-xs leading-5 text-muted">
            Bids reserve funds. Outbid reservations are released; winning funds
            are held in escrow.
          </p>

          <p v-if="!activity.length" class="py-8 text-sm text-muted">
            No matching transactions yet.
          </p>
          <div
            v-for="l in activity"
            :key="l.id"
            class="flex flex-wrap items-center justify-between gap-3 border-t border-border py-4 first:border-t-0 first:pt-2"
          >
            <div class="flex items-center gap-3">
              <span
                class="grid h-9 w-9 place-items-center rounded-lg"
                :class="
                  l.available_delta > 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-surface text-body'
                "
                aria-hidden="true"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.8"
                    :d="
                      l.available_delta > 0
                        ? 'M12 4v12m0 0l4-4m-4 4l-4-4M5 20h14'
                        : 'M12 20V8m0 0l4 4m-4-4l-4 4M5 4h14'
                    "
                  />
                </svg>
              </span>
              <div>
                <p class="text-sm font-medium capitalize text-heading">
                  {{ l.reason.replaceAll("_", " ") }}
                </p>
                <p class="mt-0.5 text-xs text-muted">
                  {{ new Date(l.created_at).toLocaleString() }}
                </p>
              </div>
            </div>
            <div class="text-right text-sm">
              <p
                class="numeric font-semibold"
                :class="l.available_delta > 0 ? 'text-success' : 'text-heading'"
              >
                {{ l.available_delta > 0 ? "+" : "" }}{{ money(l.available_delta) }}
              </p>
              <p class="mt-0.5 text-xs text-muted">
                Reserved {{ money(l.reserved_delta) }}
              </p>
            </div>
          </div>
        </section>

        <section class="surface-panel p-5 text-center sm:p-6 lg:col-span-2">
          <h2 class="text-left font-display text-lg font-semibold text-heading">
            Balance allocation
          </h2>
          <div class="allocation mx-auto my-7" :style="{ '--share': share + '%' }">
            <div>
              <p class="numeric font-display text-3xl font-semibold text-heading">
                {{ share }}%
              </p>
              <p class="mt-1 text-xs text-muted">Available</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-xs text-muted">Available</p>
              <p class="numeric mt-1.5 font-semibold text-heading">
                {{ money(account.available) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted">Reserved funds</p>
              <p class="numeric mt-1.5 font-semibold text-heading">
                {{ money(account.reserved) }}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div class="grid gap-5 md:grid-cols-2">
        <form id="topup" class="surface-panel space-y-4 p-5 sm:p-6" @submit.prevent="create">
          <p class="kicker">
            {{ route.query.auction ? "Buy Now with KHQR" : "Secure checkout" }}
          </p>
          <p v-if="route.query.auction" class="text-sm leading-6 text-body">
            Pay ${{ (Number(route.query.quote) / 100).toFixed(2) }} directly
            with KHQR. No top-up step needed. If the item becomes unavailable
            before verification, the received amount goes to your wallet.
          </p>
          <p
            v-if="activeMode === 'live' && !liveEnabled"
            class="rounded-lg border border-gold-200 bg-gold-50 p-3 text-sm text-gold-900"
            role="status"
          >
            New real payments are paused. Existing receipts can still be
            checked.
          </p>
          <h2 class="font-display text-xl font-semibold text-heading">
            {{
              route.query.auction
                ? "Pay for this item"
                : route.query.order
                  ? "Pay winning order"
                  : "Top up your wallet"
            }}
          </h2>
          <p class="text-sm leading-6 text-body">
            {{
              route.query.order
                ? "Your order determines the payable amount."
                : "From $0.01 to $1,000 per checkout. Your bank may apply its own minimum."
            }}
          </p>
          <label
            v-if="!route.query.order && !route.query.auction"
            for="wallet-amount"
            class="label"
          >
            Amount (USD)
          </label>
          <input
            v-if="!route.query.order && !route.query.auction"
            id="wallet-amount"
            v-model="amount"
            type="number"
            min="0.01"
            max="1000"
            step="0.01"
            required
            class="input"
          />
          <div
            v-if="!route.query.order && !route.query.auction"
            class="flex flex-wrap gap-2"
          >
            <button
              v-for="n in ['0.01', '0.10', '1', '5']"
              :key="n"
              type="button"
              class="btn-outline btn-sm"
              @click="amount = n"
            >
              ${{ n }}
            </button>
          </div>
          <button
            :disabled="
              busy || !eligible || (activeMode === 'live' && !liveEnabled)
            "
            class="btn-primary w-full"
          >
            Create {{ activeMode }} checkout
          </button>
          <p class="text-xs leading-5 text-muted">
            Live checkout uses our Bakong KHQR. Demo checkout uses a simulation
            button.
          </p>
        </form>

        <section v-if="checkout" class="surface-panel space-y-4 p-5 sm:p-6" aria-live="polite">
          <div class="flex items-center justify-between gap-3">
            <p class="kicker">{{ checkout.mode }} checkout</p>
            <span class="text-xs font-semibold uppercase tracking-wide text-muted">
              {{ checkout.status }}
            </span>
          </div>
          <h2 class="numeric font-display text-3xl font-semibold text-heading">
            {{ money(checkout.amount_minor) }}
          </h2>
          <p class="break-all text-xs text-muted">{{ checkout.id }}</p>

          <template v-if="checkout.status === 'pending'">
            <p class="text-sm text-body">
              Expires in {{ Math.floor(remaining / 60) }}:{{
                String(remaining % 60).padStart(2, "0")
              }}
            </p>
            <div v-if="qr" class="khqr mx-auto">
              <div class="bg-danger px-5 py-3 text-center text-lg font-bold text-white">
                KHQR
              </div>
              <img :src="qr" alt="Live Bakong KHQR payment code" class="w-full" />
              <p class="pb-4 text-center text-xs text-muted">
                Scan with a KHQR-compatible banking app
              </p>
            </div>
            <p v-else class="rounded-xl bg-surface p-8 text-center text-sm text-body">
              Demo payment — no bank QR or money transfer.
            </p>
            <div class="flex flex-wrap gap-3">
              <button :disabled="busy" class="btn-outline" @click="check">
                Check payment
              </button>
              <button
                v-if="checkout.mode === 'demo'"
                :disabled="busy || remaining === 0"
                class="btn-primary"
                @click="simulate"
              >
                Simulate successful payment
              </button>
            </div>
            <p v-if="checkout.mode === 'live'" class="text-xs leading-5 text-muted">
              Automatic checks will retry shortly. You can also use Check
              payment.
            </p>
          </template>

          <div v-else-if="checkout.status === 'paid'" class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p class="font-medium">Payment confirmed.</p>
            <p class="mt-1">Your balance or order is updated.</p>
            <span v-if="checkout.purchase_note" class="mt-2 block">{{ checkout.purchase_note }}</span>
            <router-link
              v-if="checkout.purchased_order_id"
              :to="'/orders/' + checkout.purchased_order_id"
              class="mt-2 block font-semibold underline"
            >
              View your purchase &rarr;
            </router-link>
            <router-link to="/documents" class="mt-1 block font-semibold underline">
              View receipt
            </router-link>
          </div>

          <div v-else-if="checkout.status === 'reconciliation'" class="rounded-xl border border-gold-200 bg-gold-50 p-4 text-sm text-gold-900">
            This receipt needs staff reconciliation. Contact your project
            administrator.
          </div>

          <div v-else class="space-y-3 text-sm text-body">
            <p>
              This QR has expired. If you already paid, check its receipt before
              creating another payment.
            </p>
            <button
              v-if="checkout.mode === 'live'"
              :disabled="busy"
              class="btn-outline btn-sm"
              @click="check"
            >
              Check payment receipt
            </button>
          </div>
        </section>

        <section
          v-else
          class="surface-panel flex flex-col justify-center p-8 text-center"
        >
          <span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-navy-50 text-navy-700">
            <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
            </svg>
          </span>
          <h2 class="mt-4 font-display text-lg font-semibold text-heading">
            Your payment QR appears here
          </h2>
          <p class="mt-2 text-sm leading-6 text-body">
            Choose an amount to create a secure, expiring checkout.
          </p>
        </section>
      </div>

      <WithdrawalPanel
        :mode="mode"
        :available="Number(account.available)"
        :eligible="!!eligible"
        @changed="run(load)"
      />

      <div class="grid gap-5 md:grid-cols-2">
        <section class="surface-panel p-5 sm:p-6">
          <h2 class="font-display text-lg font-semibold text-heading">
            Recent checkouts
          </h2>
          <p v-if="!overview.payments.length" class="py-6 text-sm text-muted">
            No checkouts yet.
          </p>
          <button
            v-for="p in overview.payments"
            :key="p.id"
            class="flex w-full flex-wrap items-center justify-between gap-3 border-t border-border py-3.5 text-left text-sm first:border-t-0"
            @click="run(() => show(p))"
          >
            <span class="font-medium text-heading">
              {{ p.mode }} · {{ money(p.amount_minor) }} ·
              {{ p.order_id ? "Order payment" : "Top-up" }}
            </span>
            <span class="text-xs text-muted">
              {{ p.status }} · {{ new Date(p.created_at).toLocaleString() }}
            </span>
          </button>
        </section>

        <section class="surface-panel p-5 sm:p-6">
          <div class="mb-2 flex items-center justify-between gap-3">
            <h2 class="font-display text-lg font-semibold text-heading">
              Invoice activity
            </h2>
            <router-link
              to="/documents"
              class="text-sm font-semibold text-navy-700 hover:text-navy-900"
            >
              View all &rarr;
            </router-link>
          </div>
          <p
            v-if="!documents.filter((d) => d.mode === mode).length"
            class="py-4 text-sm text-muted"
          >
            Invoices and confirmed payment receipts will appear here.
          </p>
          <router-link
            v-for="d in documents.filter((d) => d.mode === mode).slice(0, 6)"
            :key="d.id"
            :to="'/documents/' + d.id"
            class="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3.5 text-sm first:border-t-0"
          >
            <span class="font-medium text-heading">{{ d.number }}</span>
            <span class="min-w-0 flex-1 truncate text-body">{{ d.snapshot.item }}</span>
            <span class="capitalize text-navy-700">{{ d.kind }}</span>
            <span class="numeric font-medium text-heading">{{ money(d.amount_minor) }}</span>
          </router-link>
        </section>
      </div>
    </main>
  </UserLayout>
</template>
<style scoped>
.wallet-card {
  color: white;
  border-radius: 1rem;
  padding: 1.5rem;
  background:
    radial-gradient(ellipse at 92% 88%, rgba(192, 138, 46, 0.28) 0 34%, transparent 35%),
    linear-gradient(120deg, #163e5f, #0b1b2b);
  box-shadow: 0 18px 40px -18px rgba(11, 27, 43, 0.55);
}

.wallet-action {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 0.4rem;
  border-radius: 0.5rem;
  padding: 0.5rem 0.25rem;
  font-size: 11px;
  font-weight: 500;
  color: #475467;
  transition: background-color 0.2s, color 0.2s;
}

.wallet-action:hover {
  background: #fff;
  color: #0b1b2b;
}

.wallet-action-icon {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: #fff;
  color: #163e5f;
}

.allocation {
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: conic-gradient(#163e5f var(--share), #eef3f8 0);
  padding: 16px;
}

.allocation > div {
  background: #fff;
  border-radius: 50%;
  height: 100%;
  display: flex;
  justify-content: center;
  flex-direction: column;
}

.khqr {
  max-width: 280px;
  border: 1px solid #e4e8ee;
  border-radius: 1rem;
  overflow: hidden;
}
</style>
