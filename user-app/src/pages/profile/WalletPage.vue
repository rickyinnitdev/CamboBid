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
      <p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
      <p v-else>Loading your wallet and payment history…</p>
      <button v-if="error" class="underline mt-4" @click="reloadWallet">
        Reload wallet
      </button>
    </div>
    <main v-else class="wallet-shell page-container space-y-6">
      <div class="flex flex-wrap justify-between items-center gap-4">
        <div>
          <p class="eyebrow">CamboBid finance</p>
          <h1 class="text-3xl font-bold mt-2">Your wallet, at a glance.</h1>
          <p class="text-slate-500 mt-2">
            Top up, follow your bids and keep every payment in view.
          </p>
        </div>
        <router-link to="/account/security" class="wallet-link"
          >Account security ↗</router-link
        >
      </div>
      <div
        class="flex flex-wrap justify-between gap-3 bg-white/70 rounded-2xl p-3"
      >
        <div class="flex gap-2">
          <button
            v-for="m in ['demo', 'live']"
            :key="m"
            class="rounded-xl px-5 py-2 text-sm"
            :class="mode === m ? 'bg-teal-800 text-white' : 'text-slate-500'"
            @click="mode = m"
          >
            {{ m === "demo" ? "Demo wallet" : "Live wallet" }}
          </button>
        </div>
        <p class="text-xs text-slate-500 self-center px-2">
          Checkout environment:
          <strong class="uppercase">{{ activeMode }}</strong>
        </p>
      </div>
      <p
        v-if="error"
        role="alert"
        class="rounded-xl bg-red-50 p-4 text-red-700"
      >
        {{ error }}
        <span v-if="checkout?.status === 'pending'"
          >Your checkout is saved. Verification will retry automatically; do not
          pay again.</span
        >
      </p>
      <p
        v-if="status && !eligible"
        class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
      >
        Complete email confirmation, ID approval, policy agreement and
        authenticator verification in
        <router-link to="/account/security" class="underline font-semibold"
          >Account security</router-link
        >
        to top up or pay.
      </p>
      <section
        v-if="pendingEarnings > 0"
        class="rounded-2xl bg-blue-50 border border-blue-100 p-5 flex flex-wrap justify-between gap-3"
      >
        <div>
          <p class="font-semibold">
            Pending sale proceeds: {{ money(pendingEarnings) }}
          </p>
          <p class="text-sm text-slate-600 mt-2">
            Held in escrow. These funds enter your available wallet after the
            buyer confirms delivery or staff resolves a dispute.
          </p>
        </div>
        <router-link
          to="/orders?tab=sales"
          class="text-sm text-blue-800 underline self-center"
          >View my sales →</router-link
        >
      </section>
      <div class="grid gap-6 lg:grid-cols-5">
        <section class="wallet-panel lg:col-span-3">
          <div class="flex justify-between">
            <h2 class="font-semibold">CamboBid account</h2>
            <span class="text-xs text-slate-400 uppercase"
              >{{ mode }} · USD</span
            >
          </div>
          <div class="wallet-card mt-6">
            <div class="flex justify-between">
              <span class="font-bold text-lg">CamboBid</span
              ><span class="text-xs uppercase tracking-widest">{{
                mode === "live" ? "KHQR wallet" : "Demo wallet"
              }}</span>
            </div>
            <p class="text-xs text-teal-100 mt-10">Available to bid</p>
            <p class="text-4xl font-semibold mt-2">
              {{ money(account.available) }}
            </p>
            <div class="flex justify-between text-xs mt-8 text-teal-100">
              <span>SECURE WALLET</span
              ><span>USD / {{ mode?.toUpperCase() }}</span>
            </div>
          </div>
          <p class="mt-5 text-xs text-slate-500">
            {{
              mode === "demo"
                ? "Demo funds have no cash value and never move bank money."
                : "Live balances reflect confirmed bank receipts. Request a withdrawal below; authorized staff transfer the funds to your bank account."
            }}
          </p>
        </section>
        <section
          class="wallet-panel lg:col-span-2 flex flex-col justify-center text-center"
        >
          <p class="text-sm text-slate-500">Your total balance</p>
          <p class="text-4xl font-bold text-teal-800 mt-4">
            {{ money(total) }}
          </p>
          <p class="text-xs text-slate-400 mt-3">
            Available + reserved · {{ mode }} funds
          </p>
          <div class="grid grid-cols-4 gap-2 bg-slate-50 rounded-2xl p-3 mt-7">
            <a href="#withdrawals" class="wallet-action"
              ><span>↗</span>Withdraw</a
            >
            <a href="#topup" class="wallet-action"><span>＋</span>Top up</a
            ><router-link to="/documents" class="wallet-action"
              ><span>▤</span>Invoices</router-link
            ><router-link to="/orders" class="wallet-action"
              ><span>↗</span>Orders</router-link
            >
          </div>
        </section>
      </div>
      <div class="grid gap-6 lg:grid-cols-5">
        <section class="wallet-panel lg:col-span-3">
          <div class="flex flex-wrap justify-between gap-3">
            <h2 class="font-semibold self-center">Recent transactions</h2>
            <input
              v-model="search"
              aria-label="Search wallet activity"
              placeholder="Search activity…"
              class="border rounded-xl px-3 py-2 text-sm max-w-full"
            />
          </div>
          <p class="text-xs text-slate-500 mt-3 mb-5">
            Bids reserve funds. Outbid reservations are released; winning funds
            are held in escrow.
          </p>
          <p v-if="!activity.length" class="py-8 text-sm text-slate-400">
            No matching transactions yet.
          </p>
          <div
            v-for="l in activity"
            :key="l.id"
            class="flex flex-wrap justify-between items-center gap-3 py-4 border-t border-slate-100"
          >
            <div class="flex gap-3 items-center">
              <span
                class="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 grid place-items-center"
                >{{ l.available_delta > 0 ? "↙" : "↗" }}</span
              >
              <div>
                <p class="text-sm font-medium capitalize">
                  {{ l.reason.replaceAll("_", " ") }}
                </p>
                <p class="text-xs text-slate-400 mt-1">
                  {{ new Date(l.created_at).toLocaleString() }}
                </p>
              </div>
            </div>
            <div class="text-right text-sm">
              <p
                :class="
                  l.available_delta > 0 ? 'text-teal-700' : 'text-slate-700'
                "
              >
                {{ l.available_delta > 0 ? "+" : ""
                }}{{ money(l.available_delta) }}
              </p>
              <p class="text-xs text-slate-400 mt-1">
                Reserved {{ money(l.reserved_delta) }}
              </p>
            </div>
          </div>
        </section>
        <section class="wallet-panel lg:col-span-2 text-center">
          <h2 class="font-semibold text-left">Balance allocation</h2>
          <div
            class="allocation mx-auto my-8"
            :style="{ '--share': share + '%' }"
          >
            <div>
              <p class="text-3xl font-bold">{{ share }}%</p>
              <p class="text-xs text-slate-500 mt-1">Available</p>
            </div>
          </div>
          <div class="grid grid-cols-2 text-sm">
            <div>
              <p class="text-slate-400 text-xs">Available</p>
              <p class="font-semibold mt-2">{{ money(account.available) }}</p>
            </div>
            <div>
              <p class="text-slate-400 text-xs">Reserved funds</p>
              <p class="font-semibold mt-2">{{ money(account.reserved) }}</p>
            </div>
          </div>
        </section>
      </div>
      <div class="grid gap-6 md:grid-cols-2">
        <form
          id="topup"
          class="wallet-panel space-y-4"
          @submit.prevent="create"
        >
          <p class="eyebrow">
            {{ route.query.auction ? "Buy Now with KHQR" : "Secure checkout" }}
          </p>
          <p v-if="route.query.auction" class="text-sm">
            Pay ${{ (Number(route.query.quote) / 100).toFixed(2) }} directly
            with KHQR. No top-up step needed. If the item becomes unavailable
            before verification, the received amount goes to your wallet.
          </p>
          <p
            v-if="activeMode === 'live' && !liveEnabled"
            class="text-sm text-amber-800"
            role="status"
          >
            New real payments are paused. Existing receipts can still be
            checked.
          </p>
          <h2 class="text-xl font-bold">
            {{
              route.query.auction
                ? "Pay for this item"
                : route.query.order
                  ? "Pay winning order"
                  : "Top up your wallet"
            }}
          </h2>
          <p class="text-sm text-slate-500">
            {{
              route.query.order
                ? "Your order determines the payable amount."
                : "From $0.01 to $1,000 per checkout. Your bank may apply its own minimum."
            }}
          </p>
          <label
            v-if="!route.query.order && !route.query.auction"
            class="block text-sm"
            >Amount (USD)<input
              v-model="amount"
              type="number"
              min="0.01"
              max="1000"
              step="0.01"
              required
              class="block w-full mt-2 border rounded-xl p-3"
          /></label>
          <div
            v-if="!route.query.order && !route.query.auction"
            class="flex gap-2"
          >
            <button
              v-for="n in ['0.01', '0.10', '1', '5']"
              :key="n"
              type="button"
              class="border rounded-lg px-3 py-2 text-sm"
              @click="amount = n"
            >
              ${{ n }}
            </button>
          </div>
          <button
            :disabled="
              busy || !eligible || (activeMode === 'live' && !liveEnabled)
            "
            class="rounded-xl bg-teal-800 text-white px-5 py-3 disabled:opacity-40"
          >
            Create {{ activeMode }} checkout
          </button>
          <p class="text-xs text-slate-400">
            Live checkout uses our Bakong KHQR. Demo checkout uses a simulation
            button.
          </p>
        </form>
        <section
          v-if="checkout"
          class="wallet-panel space-y-4"
          aria-live="polite"
        >
          <div class="flex justify-between items-center">
            <p class="eyebrow">{{ checkout.mode }} checkout</p>
            <span class="text-xs uppercase text-slate-500">{{
              checkout.status
            }}</span>
          </div>
          <h2 class="text-3xl font-bold">{{ money(checkout.amount_minor) }}</h2>
          <p class="break-all text-xs text-slate-400">{{ checkout.id }}</p>
          <template v-if="checkout.status === 'pending'"
            ><p class="text-sm">
              Expires in {{ Math.floor(remaining / 60) }}:{{
                String(remaining % 60).padStart(2, "0")
              }}
            </p>
            <div v-if="qr" class="khqr mx-auto">
              <div class="bg-red-600 text-white px-5 py-3 text-lg font-bold">
                KHQR
              </div>
              <img
                :src="qr"
                alt="Live Bakong KHQR payment code"
                class="w-full"
              />
              <p class="text-center text-xs pb-4">
                Scan with a KHQR-compatible banking app
              </p>
            </div>
            <p v-else class="bg-slate-50 rounded-xl p-8 text-center text-sm">
              Demo payment — no bank QR or money transfer.
            </p>
            <div class="flex flex-wrap gap-3">
              <button
                :disabled="busy"
                class="border rounded-xl px-4 py-3 text-sm"
                @click="check"
              >
                Check payment</button
              ><button
                v-if="checkout.mode === 'demo'"
                :disabled="busy || remaining === 0"
                class="bg-teal-800 text-white rounded-xl px-4 py-3 text-sm disabled:opacity-40"
                @click="simulate"
              >
                Simulate successful payment
              </button>
            </div>
            <p v-if="checkout.mode === 'live'" class="text-xs text-slate-500">
              Automatic checks will retry shortly. You can also use Check
              payment.
            </p></template
          >
          <p v-else-if="checkout.status === 'paid'" class="text-teal-800">
            Payment confirmed. Your balance or order is updated.
            <span v-if="checkout.purchase_note" class="block mt-2">{{
              checkout.purchase_note
            }}</span>
            <router-link
              v-if="checkout.purchased_order_id"
              :to="'/orders/' + checkout.purchased_order_id"
              class="block underline mt-2"
              >View your purchase →</router-link
            >
            <router-link to="/documents" class="underline"
              >View receipt</router-link
            >
          </p>
          <p
            v-else-if="checkout.status === 'reconciliation'"
            class="text-amber-800"
          >
            This receipt needs staff reconciliation. Contact your project
            administrator.
          </p>
          <div v-else class="text-sm space-y-3">
            <p>
              This QR has expired. If you already paid, check its receipt before
              creating another payment.
            </p>
            <button
              v-if="checkout.mode === 'live'"
              :disabled="busy"
              class="underline"
              @click="check"
            >
              Check payment receipt
            </button>
          </div>
        </section>
        <section
          v-else
          class="wallet-panel flex flex-col justify-center text-center"
        >
          <span class="text-5xl text-teal-800 mb-5">▦</span>
          <h2 class="font-semibold">Your payment QR appears here</h2>
          <p class="text-sm text-slate-400 mt-3">
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
      <section class="wallet-panel">
        <h2 class="font-semibold mb-4">Recent checkouts</h2>
        <p v-if="!overview.payments.length" class="text-sm text-slate-400">
          No checkouts yet.
        </p>
        <button
          v-for="p in overview.payments"
          :key="p.id"
          class="flex w-full flex-wrap justify-between gap-3 py-4 border-t text-sm text-left"
          @click="run(() => show(p))"
        >
          <span
            >{{ p.mode }} · {{ money(p.amount_minor) }} ·
            {{ p.order_id ? "Order payment" : "Top-up" }}</span
          ><span class="text-slate-500"
            >{{ p.status }} ·
            {{ new Date(p.created_at).toLocaleString() }}</span
          >
        </button>
      </section>
      <section class="wallet-panel">
        <div class="flex justify-between mb-5">
          <h2 class="font-semibold">Invoice activity</h2>
          <router-link to="/documents" class="wallet-link"
            >View all ↗</router-link
          >
        </div>
        <p
          v-if="!documents.filter((d) => d.mode === mode).length"
          class="text-sm text-slate-400 py-4"
        >
          Invoices and confirmed payment receipts will appear here.
        </p>
        <router-link
          v-for="d in documents.filter((d) => d.mode === mode).slice(0, 6)"
          :key="d.id"
          :to="'/documents/' + d.id"
          class="flex flex-wrap justify-between gap-3 py-4 border-t text-sm"
          ><span class="font-medium">{{ d.number }}</span
          ><span class="text-slate-500">{{ d.snapshot.item }}</span
          ><span class="capitalize text-teal-700">{{ d.kind }}</span
          ><span>{{ money(d.amount_minor) }}</span></router-link
        >
      </section>
    </main></UserLayout
  >
</template>
<style scoped>
.wallet-shell {
  max-width: 1200px;
  background: #eef4f5;
  border-radius: 30px;
  margin-top: 28px;
  margin-bottom: 32px;
  padding: 32px;
}
.wallet-panel {
  background: white;
  border: 1px solid #e7eef0;
  border-radius: 24px;
  padding: 26px;
}
.eyebrow {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.13em;
  color: #216875;
  font-weight: 600;
}
.wallet-card {
  color: white;
  border-radius: 22px;
  padding: 26px;
  background:
    radial-gradient(ellipse at 90% 90%, #2a7d8777 0 36%, transparent 37%),
    linear-gradient(120deg, #216875, #113f4b);
  box-shadow: 0 15px 30px #23586720;
}
.wallet-action {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  color: #245965;
}
.wallet-action span {
  display: grid;
  place-items: center;
  background: white;
  width: 42px;
  height: 40px;
  border-radius: 12px;
  font-size: 22px;
}
.wallet-link {
  font-size: 13px;
  color: #216875;
  font-weight: 600;
}
.allocation {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: conic-gradient(#216875 var(--share), #eaf0f1 0);
  padding: 17px;
}
.allocation > div {
  background: white;
  border-radius: 50%;
  height: 100%;
  display: flex;
  justify-content: center;
  flex-direction: column;
}
.khqr {
  max-width: 280px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
}
@media (max-width: 640px) {
  .wallet-shell {
    margin: 0;
    border-radius: 0;
    padding: 20px 14px;
  }
  .wallet-panel {
    padding: 20px;
  }
  .wallet-card {
    padding: 22px;
  }
}
</style>
