<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { rpc, invoke } from "@/services/securityService";
import AdminLayout from "@/layouts/AdminLayout.vue";
const router = useRouter(),
  auction = ref(""),
  error = ref(""),
  busy = ref(false);
const sampleMode = ref("demo"),
  samples = ref([]);
async function createSamples(count, minutes) {
  busy.value = true;
  error.value = "";
  try {
    samples.value = await rpc("create_sample_auctions", {
      p_count: count,
      p_minutes: minutes,
      p_mode: sampleMode.value,
    });
    if (count === 1) auction.value = samples.value[0].id;
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function create() {
  busy.value = true;
  error.value = "";
  try {
    auction.value = await rpc("create_presentation_auction");
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function close() {
  busy.value = true;
  error.value = "";
  try {
    await invoke("close-auction", {
      auction_id: auction.value,
      reason: "University presentation",
    });
    await router.push("/admin/escrow");
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <AdminLayout
    ><main class="max-w-3xl space-y-6">
      <h1 class="text-3xl font-bold">Presentation rehearsal</h1>
      <p class="text-slate-600">
        Prepare two bidder sessions in separate browser profiles and one staff
        session. Complete email, policy, authenticator and sample-ID review in
        advance. Keep authenticator setup keys off the projector.
      </p>
      <section class="rounded-2xl border bg-white p-6 space-y-4">
        <h2 class="text-xl font-bold">One-cent payment testing</h2>
        <p class="text-sm">
          Use two separate bidder accounts to compete and a seller/staff account
          to create and settle the auction. Top-ups credit the bidder wallet;
          winning funds enter escrow; delivery confirmation credits the seller
          wallet. A lost bid releases the reservation.
        </p>
        <div class="flex flex-wrap gap-3 items-center">
          <label
            >Environment
            <select v-model="sampleMode" class="border rounded-xl p-2 ml-2">
              <option value="demo">Demo funds</option>
              <option value="live">Real KHQR funds</option>
            </select></label
          ><button
            :disabled="busy"
            class="btn-primary"
            @click="createSamples(1, 2)"
          >
            Create 2-minute $0.01 auction</button
          ><button
            :disabled="busy"
            class="btn-secondary"
            @click="createSamples(10, 4320)"
          >
            Create 10 sample auctions
          </button>
        </div>
        <p class="text-xs text-slate-500">
          Real KHQR must first be configured and enabled in Integrations. Live
          sample auctions move actual money and have no physical delivery; agree
          on the test refund with your friend.
        </p>
        <ul v-if="samples.length" class="space-y-2 text-sm">
          <li v-for="s in samples" :key="s.id">
            <a
              :href="'https://cambobid.vercel.app/auctions/' + s.id"
              target="_blank"
              rel="noopener"
              class="text-teal-800 underline"
              >{{ s.title }} · {{ s.mode }} ↗</a
            >
          </li>
        </ul>
        <hr />
        <h2 class="text-xl font-bold">1. Prepare bidder funds</h2>
        <p>
          Each bidder opens Wallet, creates a $100 demo checkout and simulates
          success. Their demo balance should show $100 available and $0
          reserved.
        </p>
        <h2 class="text-xl font-bold">2. Start a bidding battle</h2>
        <p>
          Create a new $10 sample auction. It runs for two minutes, with a
          one-minute extension for bids in the final twenty seconds. The
          creating staff account is the seller and cannot bid.
        </p>
        <button
          :disabled="busy"
          class="rounded-xl bg-blue-800 px-5 py-3 text-white disabled:opacity-50"
          @click="create"
        >
          Create demo auction
        </button>
        <p v-if="auction" class="break-all rounded-xl bg-blue-50 p-4">
          Open <strong>/auctions/{{ auction }}</strong> on the customer app in
          both bidder sessions.
        </p>
        <h2 class="text-xl font-bold">3. Demonstrate the controls</h2>
        <ol class="list-decimal space-y-2 pl-5 text-sm">
          <li>Bidder A bids $20. Show $80 available / $20 reserved.</li>
          <li>
            Bidder B bids $25. Show A's $20 released and B's $25 reserved.
          </li>
          <li>
            Bidder A enables proxy bidding with bid $30 and maximum $60. Show
            the maximum reservation.
          </li>
          <li>Bidder B bids $35. A automatically leads at $36.</li>
          <li>Place a late bid to demonstrate the timer extension.</li>
          <li>
            After the final timer ends, settle below. Show the held order,
            delivery confirmation and seller ledger.
          </li>
        </ol>
        <button
          v-if="auction"
          :disabled="busy"
          class="rounded-xl border px-5 py-3 disabled:opacity-50"
          @click="close"
        >
          Settle after timer ends
        </button>
        <p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
      </section>
    </main></AdminLayout
  >
</template>
