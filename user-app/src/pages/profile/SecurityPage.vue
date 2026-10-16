<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "@/services/supabase";
import { securityService } from "@/services/securityService";
import UserLayout from "@/components/layout/UserLayout.vue";
import MfaPanel from "@/components/base/MfaPanel.vue";
const status = ref(null),
  policies = ref([]),
  terms = ref(false),
  privacy = ref(false),
  error = ref(""),
  success = ref(""),
  busy = ref(false);
async function load() {
  status.value = await securityService.status();
  policies.value = await securityService.policies();
}
async function run(fn) {
  error.value = "";
  success.value = "";
  busy.value = true;
  try {
    await fn();
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
onMounted(() => run(load));
async function accept() {
  await run(async () => {
    await securityService.accept(
      policies.value.find((p) => p.kind === "terms").version,
      policies.value.find((p) => p.kind === "privacy").version,
    );
    await load();
    success.value = "Your policy acceptance has been recorded.";
  });
}
async function refresh() {
  await run(async () => {
    const { error: e } = await supabase.auth.refreshSession();
    if (e) throw e;
    await load();
  });
}
async function resend() {
  await run(async () => {
    await securityService.resend();
    success.value = "Confirmation email sent.";
  });
}
</script>
<template>
  <UserLayout
    ><main class="page-container max-w-3xl space-y-6">
      <div>
        <p class="section-eyebrow">Your account</p>
        <h1 class="text-3xl font-bold">Security &amp; verification</h1>
        <p class="mt-2 text-slate-600">
          Complete these steps before bidding, topping up or paying an order.
        </p>
      </div>
      <p
        v-if="error"
        role="alert"
        class="rounded-xl bg-red-50 p-4 text-red-700"
      >
        {{ error }}
      </p>
      <p
        v-if="success"
        role="status"
        class="rounded-xl bg-green-50 p-4 text-green-800"
      >
        {{ success }}
      </p>
      <section v-if="status" class="rounded-2xl border bg-white p-6 space-y-3">
        <p v-if="status.suspended" class="text-red-700">
          This account is suspended. Contact your project administrator.
        </p>
        <p>
          Email:
          <strong>{{
            status.email_confirmed_at ? "Verified" : "Needs confirmation"
          }}</strong>
        </p>
        <p>
          Identity:
          <strong>{{ status.identity_status.replaceAll("_", " ") }}</strong> ·
          <router-link to="/verify-identity" class="text-blue-700 underline"
            >Submit / view identity review</router-link
          >
        </p>
        <p>
          2FA:
          <strong>{{
            status.mfa_enabled ? "Enrolled" : "Not enrolled"
          }}</strong>
          · Session:
          <strong>{{
            status.session_verified ? "Verified with 2FA" : "Code required"
          }}</strong>
        </p>
        <p>
          Policies:
          <strong>{{
            status.policies_current
              ? "Current versions accepted"
              : "Acceptance required"
          }}</strong>
        </p>
        <div class="flex gap-4">
          <button
            v-if="!status.email_confirmed_at"
            :disabled="busy"
            class="text-blue-700 underline"
            @click="resend"
          >
            Resend confirmation</button
          ><button
            :disabled="busy"
            class="text-blue-700 underline"
            @click="refresh"
          >
            Refresh account status
          </button>
        </div>
      </section>
      <section class="rounded-2xl border bg-white p-6 space-y-4">
        <h2 class="text-lg font-bold">Terms &amp; Privacy Policy</h2>
        <p class="text-sm text-slate-600">
          Review each current version. Acceptance is recorded with your user ID,
          policy version and server time.
        </p>
        <details
          v-for="p in policies"
          :key="p.kind"
          class="rounded-xl border p-4"
        >
          <summary class="cursor-pointer font-semibold">
            {{ p.title }} · {{ p.version }}
          </summary>
          <p class="mt-4 whitespace-pre-line text-sm leading-7">
            {{ p.content }}
          </p>
        </details>
        <template v-if="status && !status.policies_current">
          <label class="flex gap-3 text-sm"
            ><input v-model="terms" type="checkbox" />I agree to the current
            Terms &amp; Conditions.</label
          >
          <label class="flex gap-3 text-sm"
            ><input v-model="privacy" type="checkbox" />I acknowledge the
            current Privacy Policy and document review process.</label
          >
          <button
            :disabled="!terms || !privacy || busy || policies.length !== 2"
            class="rounded-xl bg-blue-800 px-4 py-3 text-white disabled:opacity-50"
            @click="accept"
          >
            Save agreement
          </button>
        </template>
      </section>
      <MfaPanel @verified="run(load)" />
      <router-link
        to="/wallet"
        class="inline-block rounded-xl bg-blue-800 px-5 py-3 text-white"
        >Continue to wallet</router-link
      >
    </main></UserLayout
  >
</template>
