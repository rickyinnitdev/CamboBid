<script setup>
import { ref, onMounted } from "vue";
import AdminLayout from "@/layouts/AdminLayout.vue";
import { invoke } from "@/services/securityService";
const settings = ref(null),
  error = ref(""),
  message = ref(""),
  busy = ref(false),
  confirmation = ref("");
const bakong = ref({
    receiver: "",
    token: "",
    merchantName: "CamboBid",
    merchantCity: "Phnom Penh",
  }),
  email = ref({ apiKey: "", from: "" });
async function run(fn) {
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
function apply(s) {
  settings.value = s;
  bakong.value = { ...bakong.value, ...s.bakong, token: "" };
  email.value = { apiKey: "", from: s.email.from };
}
onMounted(() =>
  run(async () => apply(await invoke("integrations", { action: "get" }))),
);
async function save(provider) {
  await run(async () => {
    apply(
      await invoke("integrations", {
        action: "save",
        provider,
        config: provider === "bakong" ? bakong.value : email.value,
      }),
    );
    message.value =
      "Settings saved securely. Secret values are never returned to the browser.";
  });
}
async function mode(value) {
  await run(async () => {
    apply(
      await invoke("integrations", {
        action: "mode",
        mode: value,
        confirm: confirmation.value,
      }),
    );
    confirmation.value = "";
    message.value =
      "Payment environment updated. Existing auctions keep their original environment.";
  });
}
async function toggleLive() {
  await run(async () => {
    const enabled = settings.value.live_enabled === false;
    apply(
      await invoke("integrations", {
        action: "live_toggle",
        enabled,
        confirm: confirmation.value,
      }),
    );
    confirmation.value = "";
    message.value = enabled
      ? "New real payments enabled."
      : "New real payments paused. Existing receipts and held orders can still be settled.";
  });
}
async function send() {
  await run(async () => {
    const result = await invoke("integrations", { action: "send_pending" });
    message.value = result.configured
      ? `${result.accepted} emails accepted by provider. Pending jobs remain available for retry.`
      : "Configure your email provider first.";
  });
}
</script>
<template>
  <AdminLayout
    ><div class="max-w-6xl mx-auto space-y-6">
      <div>
        <p class="text-xs uppercase tracking-widest text-teal-700 mb-2">
          Platform settings
        </p>
        <h1 class="text-3xl font-bold">Payments &amp; email</h1>
        <p class="text-slate-500 mt-2">
          Configure integrations with your own accounts. Only a super admin with
          verified 2FA can make changes.
        </p>
      </div>
      <p
        v-if="error"
        role="alert"
        class="p-4 bg-red-50 text-red-700 rounded-xl"
      >
        {{ error }}
      </p>
      <p
        v-if="message"
        role="status"
        class="p-4 bg-teal-50 text-teal-900 rounded-xl"
      >
        {{ message }}
      </p>
      <section class="bg-white border rounded-2xl p-6 space-y-4">
        <div class="flex flex-wrap justify-between gap-4">
          <div>
            <h2 class="font-bold text-xl">Payment environment</h2>
            <p class="text-sm text-slate-500 mt-1">
              Active:
              <strong class="uppercase">{{
                settings?.mode || "Loading"
              }}</strong>
            </p>
          </div>
          <span class="text-xs rounded-full bg-slate-100 px-4 py-2 self-start"
            >USD · minimum $0.01</span
          >
        </div>
        <p class="text-sm">
          Live KHQR moves real bank money into your configured receiving
          account. Wallet balances are accounting records; seller withdrawals
          and bank payouts are manual. Demo funds stay separate.
        </p>
        <div class="flex flex-wrap gap-3 items-center">
          <button
            class="btn-secondary"
            :disabled="busy || !settings"
            @click="mode('demo')"
          >
            Use demo payments</button
          ><input
            v-model="confirmation"
            class="border rounded-xl p-3 grow"
            placeholder="Type ENABLE REAL PAYMENTS"
            aria-label="Real payment confirmation"
          /><button
            class="btn-primary"
            :disabled="
              busy ||
              !settings?.bakong.configured ||
              confirmation !== 'ENABLE REAL PAYMENTS'
            "
            @click="mode('live')"
          >
            Enable live KHQR
          </button>
        </div>
        <p class="text-xs text-slate-500">
          Changing environment does not convert existing auctions. Use
          Presentation to create a fresh sample auction in the chosen
          environment.
        </p>
      </section>
      <section class="bg-white border rounded-2xl p-6 space-y-4">
        <h2 class="font-bold text-xl">Real-payment switch</h2>
        <p class="font-semibold">
          {{
            !settings
              ? "Loading…"
              : settings.live_enabled === false
                ? "PAUSED — new real payments disabled"
                : "ENABLED — new real payments allowed"
          }}
        </p>
        <p class="text-sm text-slate-500">
          Pausing blocks new live top-ups, direct KHQR purchases, wallet
          purchases, bids and withdrawal requests on the server. Existing bank
          receipts remain verifiable and committed orders can settle. Previously
          displayed QRs may still be payable in a banking app.
        </p>
        <input
          v-if="settings?.live_enabled === false"
          v-model="confirmation"
          aria-label="Enable real payments confirmation"
          placeholder="Type ENABLE REAL PAYMENTS"
          class="border rounded-xl p-3 w-full"
        />
        <button
          :disabled="
            busy ||
            !settings ||
            (settings.live_enabled === false &&
              confirmation !== 'ENABLE REAL PAYMENTS')
          "
          class="btn-primary disabled:opacity-40"
          @click="toggleLive"
        >
          {{
            settings?.live_enabled === false
              ? "Enable real payments"
              : "Disable real payments"
          }}
        </button>
      </section>
      <div class="grid gap-6 lg:grid-cols-2">
        <form
          class="bg-white border rounded-2xl p-6 space-y-5"
          @submit.prevent="save('bakong')"
        >
          <div>
            <h2 class="text-xl font-bold">Bakong KHQR</h2>
            <p class="text-sm text-slate-500 mt-1">
              {{
                settings?.bakong.configured
                  ? "Credentials saved; verify a small receipt before presenting."
                  : "Not configured"
              }}
            </p>
          </div>
          <label class="block text-sm"
            >Receiving Bakong account ID<input
              v-model="bakong.receiver"
              class="block border rounded-xl p-3 w-full mt-2"
              placeholder="your_name@bank"
              required /></label
          ><label class="block text-sm"
            >Bakong API token<input
              v-model="bakong.token"
              type="password"
              autocomplete="new-password"
              class="block border rounded-xl p-3 w-full mt-2"
              :placeholder="
                settings?.bakong.configured
                  ? 'Leave blank to keep existing token'
                  : 'Enter your API token'
              " /></label
          ><label class="block text-sm"
            >Merchant name<input
              v-model="bakong.merchantName"
              maxlength="25"
              class="block border rounded-xl p-3 w-full mt-2"
              required /></label
          ><label class="block text-sm"
            >Merchant city<input
              v-model="bakong.merchantCity"
              maxlength="15"
              class="block border rounded-xl p-3 w-full mt-2"
              required /></label
          ><button :disabled="busy || !settings" class="btn-primary">
            Save Bakong settings
          </button>
          <p class="text-xs text-slate-500">
            Obtain the API token through Bakong’s developer service. QR
            generation alone does not prove a payment; the backend verifies the
            exact account, currency, amount and transaction hash.
          </p>
        </form>
        <form
          class="bg-white border rounded-2xl p-6 space-y-5"
          @submit.prevent="save('resend')"
        >
          <div>
            <h2 class="text-xl font-bold">Invoice &amp; receipt emails</h2>
            <p class="text-sm text-slate-500 mt-1">
              Resend ·
              {{
                settings?.email.configured
                  ? "Configured"
                  : "Not configured — documents stay queued"
              }}
            </p>
          </div>
          <p class="text-sm">
            Create a Resend account, verify a sending domain and create a
            sending API key. Your free Vercel subdomain cannot be used as your
            own email domain.
          </p>
          <label class="block text-sm"
            >Verified sender address<input
              v-model="email.from"
              class="block border rounded-xl p-3 w-full mt-2"
              placeholder="CamboBid &lt;receipts@your-domain.com&gt;"
              required /></label
          ><label class="block text-sm"
            >Resend API key<input
              v-model="email.apiKey"
              type="password"
              autocomplete="new-password"
              class="block border rounded-xl p-3 w-full mt-2"
              :placeholder="
                settings?.email.configured
                  ? 'Leave blank to keep existing key'
                  : 're_…'
              " /></label
          ><button :disabled="busy || !settings" class="btn-primary">
            Save email settings</button
          ><button
            type="button"
            :disabled="busy || !settings?.email.configured"
            class="btn-secondary ml-3"
            @click="send"
          >
            Send pending documents
          </button>
          <p class="text-xs text-slate-500">
            New transactions attempt delivery automatically. This button
            processes up to 10 queued documents per click. Users can also
            request their own queued copies. Provider acceptance is recorded;
            inbox delivery is not assumed.
          </p>
          <a
            class="text-sm text-teal-800 underline"
            href="https://resend.com/domains"
            target="_blank"
            rel="noopener"
            >Open Resend setup ↗</a
          >
        </form>
      </div>
    </div></AdminLayout
  >
</template>
