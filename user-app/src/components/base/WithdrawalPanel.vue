<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { withdrawalService } from "@/services/withdrawalService";
const props = defineProps({
  mode: { type: String, default: "demo" },
  available: { type: Number, default: 0 },
  eligible: Boolean,
});
const emit = defineEmits(["changed"]);
const rows = ref([]),
  amount = ref("0.01"),
  bank = ref("ABA Bank"),
  holder = ref(""),
  account = ref(""),
  requestId = ref(crypto.randomUUID()),
  busy = ref(false),
  error = ref(""),
  message = ref(""),
  history = ref(null);
const visible = computed(() => rows.value.filter((r) => r.mode === props.mode));
const reserved = computed(() =>
  visible.value
    .filter((r) => ["pending", "processing"].includes(r.status))
    .reduce((sum, r) => sum + Number(r.amount_minor), 0),
);
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n) / 100,
  );
const labels = {
  pending: "Awaiting staff review",
  processing: "In review / transfer pending",
  paid: "Paid",
  rejected: "Rejected — funds returned",
  cancelled: "Cancelled — funds returned",
};
let timer;
async function load() {
  const next = await withdrawalService.list();
  const changed = JSON.stringify(rows.value) !== JSON.stringify(next);
  rows.value = next;
  if (changed) emit("changed");
}
async function run(fn) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  message.value = "";
  try {
    await fn();
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
onMounted(() => {
  run(load);
  timer = setInterval(() => {
    if (!document.hidden && !busy.value) load().catch(() => {});
  }, 15000);
});
onUnmounted(() => clearInterval(timer));
watch(
  () => props.mode,
  () => {
    error.value = "";
    message.value = "";
    history.value = null;
  },
);
async function create() {
  await run(async () => {
    const cents = Math.round(Number(amount.value) * 100);
    if (
      !Number.isSafeInteger(cents) ||
      cents < 1 ||
      cents > 100000 ||
      Math.abs(Number(amount.value) * 100 - cents) > 0.00001
    )
      throw new Error("Enter $0.01–$1,000 with at most two decimal places");
    if (cents > props.available)
      throw new Error("Only your available balance can be withdrawn");
    const created = await withdrawalService.create(
      requestId.value,
      props.mode,
      cents,
      { bank: bank.value, holder: holder.value, account: account.value },
    );
    message.value = `Withdrawal requested: ${money(created.amount_minor)} is reserved for staff review.`;
    requestId.value = crypto.randomUUID();
    holder.value = "";
    account.value = "";
    await load();
  });
}
async function cancel(r) {
  if (
    !window.confirm(
      `Cancel this ${money(r.amount_minor)} withdrawal and return its reserved funds?`,
    )
  )
    return;
  await run(async () => {
    await withdrawalService.cancel(r.id);
    message.value =
      "Withdrawal cancelled. The reserved amount is available again.";
    await load();
  });
}
async function details(r) {
  await run(async () => {
    history.value = { id: r.id, events: await withdrawalService.events(r.id) };
  });
}
</script>
<template>
  <section id="withdrawals" class="surface-panel p-5 sm:p-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="kicker">Cash out</p>
        <h2 class="mt-2 font-display text-xl font-semibold text-heading">
          Request a withdrawal
        </h2>
      </div>
      <p class="text-sm text-muted">
        <span class="numeric font-semibold text-heading">{{ money(reserved) }}</span>
        reserved for withdrawals
      </p>
    </div>

    <p class="mt-3 max-w-2xl text-sm leading-6 text-body">
      {{
        mode === "live"
          ? "Staff reviews your request and transfers USD to your bank account outside CamboBid. The amount stays reserved until paid, rejected or cancelled."
          : "Demo withdrawals use sample funds. Staff can rehearse the process without sending bank money."
      }}
    </p>
    <p class="mt-1.5 text-xs leading-5 text-muted">
      Only available funds can be withdrawn. Bid reservations and held sale
      proceeds are not available for cash-out.
    </p>

    <p v-if="error" role="alert" class="mt-4 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
      {{ error }}
    </p>
    <p v-if="message" role="status" class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
      {{ message }}
    </p>

    <form class="mt-5 grid gap-4 sm:grid-cols-2" @submit.prevent="create">
      <div>
        <label for="withdraw-amount" class="label">Amount (USD)</label>
        <input
          id="withdraw-amount"
          v-model="amount"
          type="number"
          min="0.01"
          max="1000"
          step="0.01"
          required
          class="input"
        />
      </div>
      <div>
        <label for="withdraw-bank" class="label">Receiving bank</label>
        <input
          id="withdraw-bank"
          v-model="bank"
          maxlength="80"
          minlength="2"
          required
          class="input"
          placeholder="ABA Bank / ACLEDA Bank"
        />
      </div>
      <div>
        <label for="withdraw-holder" class="label">Account holder name</label>
        <input
          id="withdraw-holder"
          v-model="holder"
          maxlength="100"
          minlength="2"
          autocomplete="off"
          required
          class="input"
        />
      </div>
      <div>
        <label for="withdraw-account" class="label">Bank account number</label>
        <input
          id="withdraw-account"
          v-model="account"
          inputmode="numeric"
          maxlength="40"
          autocomplete="off"
          required
          class="input"
          placeholder="Account receiving USD"
        />
      </div>
      <div class="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button
          :disabled="busy || !eligible || available < 1"
          class="btn-primary"
        >
          Request {{ mode }} withdrawal
        </button>
        <span class="text-xs text-muted">
          Available: {{ money(available) }} · $0.01–$1,000 per request
        </span>
      </div>
    </form>

    <p class="mt-4 text-xs leading-5 text-muted">
      Bank details are encrypted and shown only to authorized finance staff.
      Never enter your banking password, PIN or OTP.
    </p>

    <div class="mt-6 border-t border-border pt-5">
      <h3 class="font-display text-base font-semibold text-heading">
        Withdrawal history · {{ mode }}
      </h3>
      <p v-if="!visible.length" class="mt-3 text-sm text-muted">
        No withdrawal requests yet.
      </p>
      <article
        v-for="r in visible"
        :key="r.id"
        class="space-y-2 border-t border-border py-4 text-sm first:border-t-0 first:pt-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-semibold text-heading">
            {{ money(r.amount_minor) }} · {{ r.destination_summary }}
          </span>
          <span
            class="text-xs font-medium"
            :class="r.status === 'paid' ? 'text-success' : 'text-muted'"
          >
            {{ labels[r.status] }}
          </span>
        </div>
        <p class="break-all text-xs text-muted">
          {{ new Date(r.created_at).toLocaleString() }} · {{ r.id }}
        </p>
        <p v-if="r.payment_reference" class="text-body">
          Transfer reference: <strong class="font-semibold text-heading">{{ r.payment_reference }}</strong>
        </p>
        <p v-if="r.staff_note" class="text-body">Staff note: {{ r.staff_note }}</p>
        <div class="flex gap-4 pt-1">
          <button
            :disabled="busy"
            class="text-xs font-semibold text-navy-700 underline hover:text-navy-900 disabled:opacity-50"
            @click="details(r)"
          >
            View activity
          </button>
          <button
            v-if="r.status === 'pending'"
            :disabled="busy"
            class="text-xs font-semibold text-danger underline disabled:opacity-50"
            @click="cancel(r)"
          >
            Cancel request
          </button>
        </div>
        <ol
          v-if="history?.id === r.id"
          class="mt-2 space-y-2 rounded-lg bg-surface p-3 text-xs text-body"
        >
          <li v-for="(e, i) in history.events" :key="i">
            <span class="font-semibold capitalize text-heading">{{ e.action }}</span> ·
            {{ new Date(e.created_at).toLocaleString() }}
            <p v-if="e.note" class="mt-1">{{ e.note }}</p>
          </li>
        </ol>
      </article>
    </div>
  </section>
</template>
