<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAuth } from "@/composables/useAuth";
import AdminLayout from "@/layouts/AdminLayout.vue";
import { withdrawalService } from "@/services/withdrawalService";
const { user } = useAuth(),
  rows = ref([]),
  status = ref(""),
  report = ref(null),
  selected = ref(null),
  destination = ref(null),
  events = ref([]),
  reference = ref(""),
  note = ref(""),
  confirmed = ref(false),
  busy = ref(false),
  error = ref(""),
  message = ref("");
const labels = {
  pending: "Awaiting review",
  processing: "In review",
  paid: "Paid",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
const claimed = computed(
  () =>
    selected.value?.status === "processing" &&
    selected.value.reviewed_by === user.value?.id,
);
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n) / 100,
  );
let timer;
async function load() {
  const [list, balances] = await Promise.all([
    withdrawalService.list(status.value),
    withdrawalService.report(),
  ]);
  rows.value = list;
  report.value = balances;
  if (selected.value) {
    const latest = list.find((r) => r.id === selected.value.id);
    if (latest) selected.value = latest;
  }
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
    if (!document.hidden && !busy.value) run(load);
  }, 30000);
});
onUnmounted(() => clearInterval(timer));
async function open(r) {
  selected.value = r;
  destination.value = null;
  reference.value = r.mode === "demo" ? "DEMO-" + r.id.slice(0, 8) : "";
  note.value = "";
  confirmed.value = false;
  events.value = [];
  await run(async () => {
    events.value = await withdrawalService.events(r.id);
  });
}
async function reveal() {
  await run(async () => {
    destination.value = await withdrawalService.destination(selected.value.id);
  });
}
async function claim() {
  await run(async () => {
    const updated = await withdrawalService.review(selected.value.id, "review");
    selected.value = { ...selected.value, ...updated };
    await load();
    destination.value = await withdrawalService.destination(selected.value.id);
    events.value = await withdrawalService.events(selected.value.id);
    message.value =
      "Request assigned to you. Check the destination and amount before making the transfer.";
  });
}
async function paid() {
  if (!confirmed.value || !destination.value) return;
  if (
    !window.confirm(
      `Record ${money(selected.value.amount_minor)} as paid in ${selected.value.mode} mode? This records a completed transfer; it does not send bank money.`,
    )
  )
    return;
  await run(async () => {
    const updated = await withdrawalService.review(
      selected.value.id,
      "paid",
      reference.value,
      note.value,
    );
    selected.value = { ...selected.value, ...updated };
    await load();
    events.value = await withdrawalService.events(selected.value.id);
    destination.value = null;
    confirmed.value = false;
    message.value =
      "Payout recorded. The reserved withdrawal amount has been deducted once.";
  });
}
async function reject() {
  await run(async () => {
    const updated = await withdrawalService.review(
      selected.value.id,
      "reject",
      null,
      note.value,
    );
    selected.value = { ...selected.value, ...updated };
    await load();
    events.value = await withdrawalService.events(selected.value.id);
    destination.value = null;
    message.value =
      "Request rejected. The reserved amount was returned to the user’s available wallet.";
  });
}
</script>
<template>
  <AdminLayout
    ><main class="max-w-7xl mx-auto space-y-6">
      <div class="flex flex-wrap justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-widest text-teal-700">
            Finance operations
          </p>
          <h1 class="text-3xl font-bold mt-2">Withdrawals</h1>
          <p class="text-slate-500 mt-2">
            Review requests, transfer funds in your banking app, then record the
            completed payout.
          </p>
        </div>
        <button
          :disabled="busy"
          class="btn-secondary self-start"
          @click="run(load)"
        >
          Refresh &amp; check balances
        </button>
      </div>
      <p
        v-if="error"
        role="alert"
        class="p-4 rounded-xl bg-red-50 text-red-700"
      >
        {{ error }}
      </p>
      <p
        v-if="message"
        role="status"
        class="p-4 rounded-xl bg-teal-50 text-teal-900"
      >
        {{ message }}
      </p>
      <section v-if="report" class="space-y-3">
        <p
          :class="
            report.issues.length
              ? 'bg-red-50 text-red-800'
              : 'bg-teal-50 text-teal-900'
          "
          class="p-4 rounded-xl text-sm"
        >
          {{
            report.issues.length
              ? report.issues.length +
                " wallet balance mismatch(es) detected. Investigate before paying."
              : "Internal balance checks passed: wallet totals match the ledger and bid/withdrawal reservations."
          }}
        </p>
        <div class="grid gap-4 md:grid-cols-2">
          <div
            v-for="m in report.modes"
            :key="m.mode"
            class="bg-white border rounded-2xl p-5"
          >
            <p class="text-xs uppercase font-semibold text-slate-500">
              {{ m.mode }} · USD
            </p>
            <div class="grid grid-cols-2 gap-4 mt-4 text-sm">
              <p>
                Available
                <strong class="block mt-1">{{
                  money(m.available_minor)
                }}</strong>
              </p>
              <p>
                Withdrawal holds
                <strong class="block mt-1">{{
                  money(m.withdrawal_reserved_minor)
                }}</strong>
              </p>
              <p>
                Bid holds
                <strong class="block mt-1">{{
                  money(m.bid_reserved_minor)
                }}</strong>
              </p>
              <p>
                Held order payments
                <strong class="block mt-1">{{
                  money(m.held_orders_minor)
                }}</strong>
              </p>
            </div>
          </div>
        </div>
        <p class="text-xs text-slate-500">
          These checks verify internal accounting, not the receiving bank’s
          balance. Reconcile completed bank transfers and receipts with your
          bank records.
        </p>
        <details
          v-if="report.issues.length"
          class="bg-white border rounded-xl p-4 text-xs"
        >
          <summary>View mismatched accounts</summary>
          <div
            v-for="(issue, i) in report.issues"
            :key="i"
            class="mt-3 break-all"
          >
            {{ issue }}
          </div>
        </details>
      </section>
      <div class="grid gap-6 xl:grid-cols-5">
        <section
          class="xl:col-span-3 bg-white border rounded-2xl overflow-hidden"
        >
          <div class="p-5 flex gap-3 justify-between">
            <h2 class="font-semibold self-center">Request queue</h2>
            <select
              v-model="status"
              class="border rounded-xl p-2 text-sm"
              @change="run(load)"
            >
              <option value="">All statuses</option>
              <option v-for="(label, key) in labels" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr>
                  <th class="p-4">User / destination</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th class="p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rows" :key="r.id" class="border-t">
                  <td class="p-4">
                    <p class="font-medium">
                      {{ r.owner?.display_name || r.user_id }}
                    </p>
                    <p class="text-xs text-slate-400 mt-1">
                      {{ r.owner?.email }}
                    </p>
                    <p class="text-xs mt-2">{{ r.destination_summary }}</p>
                    <p
                      v-if="r.owner?.suspended"
                      class="text-xs text-red-700 mt-1"
                    >
                      Account suspended — do not pay
                    </p>
                  </td>
                  <td class="pr-3 whitespace-nowrap">
                    <p class="font-semibold">{{ money(r.amount_minor) }}</p>
                    <p class="text-xs uppercase text-slate-400 mt-1">
                      {{ r.mode }}
                    </p>
                  </td>
                  <td class="pr-3">
                    <p>{{ labels[r.status] }}</p>
                    <p
                      v-if="r.reviewer?.display_name"
                      class="text-xs text-slate-400 mt-1"
                    >
                      {{ r.reviewer.display_name }}
                    </p>
                  </td>
                  <td class="p-4">
                    <button
                      class="underline text-teal-800"
                      :disabled="busy"
                      @click="open(r)"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="!rows.length" class="p-8 text-sm text-slate-400">
              No matching withdrawal requests.
            </p>
          </div>
        </section>
        <aside
          class="xl:col-span-2 bg-white border rounded-2xl p-6 space-y-5 self-start"
        >
          <template v-if="selected"
            ><div>
              <p class="text-xs uppercase tracking-widest text-slate-400">
                {{ selected.mode }} withdrawal
              </p>
              <h2 class="text-3xl font-bold mt-2">
                {{ money(selected.amount_minor) }}
              </h2>
              <p class="text-sm mt-2">
                {{ selected.owner?.display_name }} ·
                {{ labels[selected.status] }}
              </p>
              <p class="text-xs text-slate-400 break-all mt-2">
                {{ selected.id }}
              </p>
            </div>
            <p
              v-if="selected.mode === 'demo'"
              class="text-sm rounded-xl bg-amber-50 p-3"
            >
              Demo funds only. Rehearse the payout; do not send bank money for
              this request.
            </p>
            <button
              v-if="selected.status === 'pending'"
              :disabled="busy"
              class="btn-primary"
              @click="claim"
            >
              Claim for review
            </button>
            <p
              v-if="selected.status === 'processing' && !claimed"
              class="text-sm text-amber-800"
            >
              Another staff member is handling this transfer. Do not send a
              second payment.
            </p>
            <button
              v-if="!destination"
              class="text-sm underline text-teal-800"
              :disabled="busy"
              @click="reveal"
            >
              View bank details (audited)
            </button>
            <dl
              v-if="destination"
              class="rounded-xl bg-slate-50 p-4 text-sm space-y-3"
            >
              <div>
                <dt class="text-xs text-slate-400">Bank</dt>
                <dd class="font-semibold mt-1">{{ destination.bank }}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-400">Account holder</dt>
                <dd class="font-semibold mt-1">{{ destination.holder }}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-400">USD receiving account</dt>
                <dd class="font-mono font-semibold mt-1 break-all">
                  {{ destination.account }}
                </dd>
              </div>
            </dl>
            <template v-if="['pending', 'processing'].includes(selected.status)"
              ><label class="block text-sm"
                >Review note / rejection reason<textarea
                  v-model="note"
                  maxlength="1000"
                  rows="3"
                  class="block mt-2 p-3 border rounded-xl w-full"
                  placeholder="Notes are visible to the requester"
                ></textarea></label
              ><button
                :disabled="busy || note.trim().length < 10"
                class="text-red-700 text-sm underline disabled:opacity-40"
                @click="reject"
              >
                Reject and return funds
              </button></template
            >
            <div v-if="claimed" class="border-t pt-5 space-y-4">
              <p class="text-sm font-semibold">Record a completed payout</p>
              <p class="text-xs text-slate-500">
                Check the recipient name, account, currency and amount in your
                banking app. After the transfer succeeds, enter its actual
                reference here. This website does not initiate the bank
                transfer.
              </p>
              <label class="block text-sm"
                >Transfer reference<input
                  v-model="reference"
                  maxlength="120"
                  minlength="6"
                  class="block w-full border rounded-xl p-3 mt-2"
                  placeholder="Actual bank transaction reference" /></label
              ><label class="flex items-start gap-3 text-sm"
                ><input v-model="confirmed" type="checkbox" class="mt-1" />{{
                  selected.mode === "demo"
                    ? "I completed this demo withdrawal; no bank money was sent."
                    : "I completed the USD bank transfer to this destination and verified its success."
                }}</label
              ><button
                :disabled="
                  busy ||
                  !confirmed ||
                  !destination ||
                  reference.trim().length < 6 ||
                  selected.owner?.suspended ||
                  report?.issues.length > 0
                "
                class="btn-primary disabled:opacity-40"
                @click="paid"
              >
                {{
                  selected.mode === "demo"
                    ? "Complete demo withdrawal"
                    : "Mark bank transfer paid"
                }}
              </button>
            </div>
            <div
              v-if="selected.payment_reference"
              class="text-sm space-y-2 border-t pt-4"
            >
              <p>
                Transfer reference:
                <strong>{{ selected.payment_reference }}</strong>
              </p>
              <p>{{ selected.staff_note }}</p>
            </div>
            <section class="border-t pt-4">
              <h3 class="font-semibold text-sm">Activity</h3>
              <ol class="mt-3 space-y-3 text-xs text-slate-500">
                <li v-for="(e, i) in events" :key="i">
                  <p class="capitalize font-semibold">
                    {{ e.action }} ·
                    {{ new Date(e.created_at).toLocaleString() }}
                  </p>
                  <p v-if="e.note" class="mt-1 break-all">{{ e.note }}</p>
                </li>
              </ol>
            </section></template
          >
          <p v-else class="text-sm text-slate-400">
            Open a request to review its destination, claim it and record the
            transfer.
          </p>
        </aside>
      </div>
    </main></AdminLayout
  >
</template>
