<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import QRCode from "qrcode";
import { walletService } from "@/services/walletService";
const props = defineProps({ payment: Object });
const emit = defineEmits(["updated"]);
const qr = ref(""),
  error = ref(""),
  busy = ref(false),
  now = ref(Date.now()),
  retryAt = ref(0);
let clock,
  poll,
  controller,
  disposed = false;
const remaining = computed(() =>
  Math.max(
    0,
    Math.ceil((Date.parse(props.payment?.expires_at) - now.value) / 1000),
  ),
);
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n) / 100,
  );
watch(
  () => props.payment?.qr,
  async (value) => {
    qr.value = value
      ? await QRCode.toDataURL(value, { width: 280, margin: 2 })
      : "";
  },
  { immediate: true },
);
async function check() {
  if (busy.value || !props.payment) return;
  busy.value = true;
  error.value = "";
  retryAt.value = Date.now() + 15000;
  controller = new AbortController();
  try {
    const result = await walletService.check(
      props.payment.id,
      AbortSignal.any([controller.signal, AbortSignal.timeout(35000)]),
    );
    if (!disposed) emit("updated", result);
  } catch (e) {
    if (!disposed) {
      error.value = e.message;
      retryAt.value = Date.now() + 30000;
    }
  } finally {
    busy.value = false;
  }
}
onMounted(() => {
  clock = setInterval(() => (now.value = Date.now()), 1000);
  poll = setInterval(() => {
    if (
      !document.hidden &&
      props.payment?.status === "pending" &&
      Date.now() >= retryAt.value
    )
      check();
  }, 15000);
});
onUnmounted(() => {
  disposed = true;
  controller?.abort();
  clearInterval(clock);
  clearInterval(poll);
});
</script>
<template>
  <section
    v-if="payment"
    class="surface-panel space-y-4 p-4 sm:p-5"
    aria-label="Auction KHQR checkout"
  >
    <div class="flex items-start justify-between gap-3">
      <h3 class="font-display text-base font-semibold text-heading">
        {{ payment.bid_auction_id ? "Bid with KHQR" : "Buy Now with KHQR" }}
      </h3>
      <strong class="numeric text-heading">{{ money(payment.amount_minor) }}</strong>
    </div>
    <p class="break-all text-xs text-muted">
      {{ payment.id }} · {{ payment.status }}
    </p>
    <template v-if="payment.status === 'pending'">
      <p class="text-sm leading-6 text-body">
        Scan with your ABA, ACLEDA or another KHQR-compatible banking app.
        {{
          remaining > 0
            ? "QR expires in " + remaining + " seconds."
            : "QR expired. Check an existing payment; do not scan it again."
        }}
      </p>
      <div
        v-if="qr && remaining > 0"
        class="mx-auto max-w-[280px] overflow-hidden rounded-xl border border-border"
      >
        <div class="bg-danger px-4 py-2 font-bold text-white">KHQR</div>
        <img :src="qr" alt="Auction KHQR payment code" class="w-full" />
      </div>
      <p class="text-xs leading-5 text-muted">
        {{
          payment.bid_auction_id
            ? "Your chosen bid is submitted only after the payment is verified. If it is too low or the auction ends, your money stays in your wallet."
            : "The item stays available until payment is verified. If it sells first, your money stays in your wallet."
        }}
      </p>
    </template>
    <p v-if="error" role="alert" class="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
      {{ error }} Your checkout is saved. Checking will retry; do not pay again.
    </p>
    <p
      v-if="payment.status === 'paid'"
      role="status"
      class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
    >
      {{ payment.purchase_note || "Payment verified." }}
    </p>
    <p
      v-if="payment.status === 'reconciliation'"
      class="rounded-lg border border-gold-200 bg-gold-50 p-3 text-sm text-gold-900"
    >
      Your verified late receipt needs staff reconciliation. Do not pay again.
    </p>
    <button
      v-if="['pending', 'expired'].includes(payment.status)"
      :disabled="busy"
      type="button"
      class="btn-outline btn-sm disabled:opacity-50"
      @click="check"
    >
      {{ busy ? "Checking payment…" : "Check payment" }}
    </button>
    <router-link
      v-if="payment.purchased_order_id"
      :to="'/orders/' + payment.purchased_order_id"
      class="block text-sm font-semibold text-navy-700 underline hover:text-navy-900"
      >View your purchase &rarr;</router-link
    >
    <router-link
      v-if="
        payment.status === 'paid' &&
        !payment.purchased_order_id &&
        !payment.submitted_bid_id
      "
      to="/wallet"
      class="block text-sm font-semibold text-navy-700 underline hover:text-navy-900"
      >View credited wallet funds &rarr;</router-link
    >
    <p class="text-xs leading-5 text-muted">
      You can leave this page while verification runs. Your checkout remains in
      your payment history.
    </p>
  </section>
</template>
