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
  <section
    id="withdrawals"
    class="bg-white border border-slate-200 rounded-3xl p-6 space-y-5"
  >
    <div class="flex flex-wrap justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-widest text-teal-700">Cash out</p>
        <h2 class="text-xl font-bold mt-2">Request a withdrawal</h2>
      </div>
      <p class="text-sm text-slate-500">
        {{ money(reserved) }} reserved for withdrawals
      </p>
    </div>
    <p class="text-sm text-slate-600">
      {{
        mode === "live"
          ? "Staff reviews your request and transfers USD to your bank account outside CamboBid. The amount stays reserved until paid, rejected or cancelled."
          : "Demo withdrawals use sample funds. Staff can rehearse the process without sending bank money."
      }}
    </p>
    <p class="text-xs text-slate-500">
      Only available funds can be withdrawn. Bid reservations and held sale
      proceeds are not available for cash-out.
    </p>
    <p v-if="error" role="alert" class="bg-red-50 text-red-700 p-3 rounded-xl">
      {{ error }}
    </p>
    <p
      v-if="message"
      role="status"
      class="bg-teal-50 text-teal-900 p-3 rounded-xl"
    >
      {{ message }}
    </p>
    <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="create">
      <label class="text-sm"
        >Amount (USD)<input
          v-model="amount"
          type="number"
          min="0.01"
          max="1000"
          step="0.01"
          required
          class="block mt-2 p-3 border rounded-xl w-full" /></label
      ><label class="text-sm"
        >Receiving bank<input
          v-model="bank"
          maxlength="80"
          minlength="2"
          required
          class="block mt-2 p-3 border rounded-xl w-full"
          placeholder="ABA Bank / ACLEDA Bank" /></label
      ><label class="text-sm"
        >Account holder name<input
          v-model="holder"
          maxlength="100"
          minlength="2"
          autocomplete="off"
          required
          class="block mt-2 p-3 border rounded-xl w-full" /></label
      ><label class="text-sm"
        >Bank account number<input
          v-model="account"
          inputmode="numeric"
          maxlength="40"
          autocomplete="off"
          required
          class="block mt-2 p-3 border rounded-xl w-full"
          placeholder="Account receiving USD"
      /></label>
      <div class="sm:col-span-2 flex flex-wrap gap-4 items-center">
        <button
          :disabled="busy || !eligible || available < 1"
          class="bg-teal-800 text-white rounded-xl px-5 py-3 text-sm disabled:opacity-40"
        >
          Request {{ mode }} withdrawal</button
        ><span class="text-xs text-slate-500"
          >Available: {{ money(available) }} · $0.01–$1,000 per request</span
        >
      </div>
    </form>
    <p class="text-xs text-slate-500">
      Bank details are encrypted and shown only to authorized finance staff.
      Never enter your banking password, PIN or OTP.
    </p>
    <div class="border-t pt-5">
      <h3 class="font-semibold mb-3">Withdrawal history · {{ mode }}</h3>
      <p v-if="!visible.length" class="text-sm text-slate-400">
        No withdrawal requests yet.
      </p>
      <article
        v-for="r in visible"
        :key="r.id"
        class="border-t py-4 space-y-2 text-sm"
      >
        <div class="flex flex-wrap justify-between gap-2">
          <span class="font-semibold"
            >{{ money(r.amount_minor) }} · {{ r.destination_summary }}</span
          ><span
            :class="r.status === 'paid' ? 'text-teal-700' : 'text-slate-500'"
            >{{ labels[r.status] }}</span
          >
        </div>
        <p class="text-xs text-slate-400">
          {{ new Date(r.created_at).toLocaleString() }} · {{ r.id }}
        </p>
        <p v-if="r.payment_reference">
          Transfer reference: <strong>{{ r.payment_reference }}</strong>
        </p>
        <p v-if="r.staff_note">Staff note: {{ r.staff_note }}</p>
        <div class="flex gap-4 pt-1">
          <button
            :disabled="busy"
            class="underline text-teal-800"
            @click="details(r)"
          >
            View activity</button
          ><button
            v-if="r.status === 'pending'"
            :disabled="busy"
            class="underline text-red-700"
            @click="cancel(r)"
          >
            Cancel request
          </button>
        </div>
        <ol
          v-if="history?.id === r.id"
          class="rounded-xl bg-slate-50 p-3 space-y-2 text-xs"
        >
          <li v-for="(e, i) in history.events" :key="i">
            <span class="capitalize font-semibold">{{ e.action }}</span> ·
            {{ new Date(e.created_at).toLocaleString() }}
            <p v-if="e.note" class="mt-1">{{ e.note }}</p>
          </li>
        </ol>
      </article>
    </div>
  </section>
</template>
