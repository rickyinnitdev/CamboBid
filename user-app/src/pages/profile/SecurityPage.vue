<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "@/services/supabase";
import { securityService } from "@/services/securityService";
import UserLayout from "@/components/layout/UserLayout.vue";
import KhmerDivider from "@/components/base/KhmerDivider.vue";
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
    success.value = "Security status refreshed.";
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
  <UserLayout>
    <main class="page-container max-w-4xl space-y-6">
      <KhmerDivider />
      <div class="page-header">
        <div>
          <p class="kicker">Your account</p>
          <h1 class="page-title mt-3">Security &amp; verification</h1>
          <p class="page-subtitle mt-3">
            Complete these steps before bidding, topping up or paying an order.
          </p>
        </div>
        <router-link to="/wallet" class="btn-outline btn-sm self-start sm:self-auto">
          Continue to wallet
        </router-link>
      </div>

      <div
        v-if="error"
        role="alert"
        class="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger"
      >
        {{ error }}
      </div>
      <div
        v-if="success"
        role="status"
        class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
      >
        {{ success }}
      </div>

      <section v-if="status" class="surface-panel p-5 sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="font-display text-lg font-semibold text-heading">
              Account readiness
            </h2>
            <p class="mt-1 text-sm text-body">
              Four checks are required before you can transact.
            </p>
          </div>
          <span
            class="badge"
            :class="status.suspended ? 'bg-red-50 text-red-700' : 'bg-navy-50 text-navy-800'"
          >
            {{ status.suspended ? "Suspended" : "Active account" }}
          </span>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-border p-4">
            <p class="text-[11px] font-medium uppercase tracking-wider text-muted">
              Email
            </p>
            <p class="mt-1.5 text-sm font-semibold text-heading">
              {{ status.email_confirmed_at ? "Verified" : "Needs confirmation" }}
            </p>
            <button
              v-if="!status.email_confirmed_at"
              :disabled="busy"
              class="mt-2 text-xs font-semibold text-navy-700 underline hover:text-navy-900 disabled:opacity-50"
              @click="resend"
            >
              Resend confirmation
            </button>
          </div>

          <div class="rounded-xl border border-border p-4">
            <p class="text-[11px] font-medium uppercase tracking-wider text-muted">
              Identity
            </p>
            <p class="mt-1.5 text-sm font-semibold capitalize text-heading">
              {{ status.identity_status.replaceAll("_", " ") }}
            </p>
            <router-link
              to="/verify-identity"
              class="mt-2 inline-flex text-xs font-semibold text-navy-700 underline hover:text-navy-900"
            >
              Submit / view review
            </router-link>
          </div>

          <div class="rounded-xl border border-border p-4">
            <p class="text-[11px] font-medium uppercase tracking-wider text-muted">
              Two-factor authentication
            </p>
            <p class="mt-1.5 text-sm font-semibold text-heading">
              {{ status.mfa_enabled ? "Enrolled" : "Not enrolled" }}
            </p>
            <p class="mt-1 text-xs text-muted">
              Session:
              {{ status.session_verified ? "verified with 2FA" : "code required" }}
            </p>
          </div>

          <div class="rounded-xl border border-border p-4">
            <p class="text-[11px] font-medium uppercase tracking-wider text-muted">
              Policies
            </p>
            <p class="mt-1.5 text-sm font-semibold text-heading">
              {{ status.policies_current ? "Current versions accepted" : "Acceptance required" }}
            </p>
          </div>
        </div>

        <button
          :disabled="busy"
          class="mt-4 text-xs font-semibold text-navy-700 underline hover:text-navy-900 disabled:opacity-50"
          @click="refresh"
        >
          Refresh account status
        </button>
      </section>

      <section class="surface-panel p-5 sm:p-6">
        <h2 class="font-display text-lg font-semibold text-heading">
          Terms &amp; Privacy Policy
        </h2>
        <p class="mt-1.5 text-sm leading-6 text-body">
          Review each current version. Acceptance is recorded with your user ID,
          policy version and server time.
        </p>

        <div class="mt-5 space-y-3">
          <details
            v-for="p in policies"
            :key="p.kind"
            class="group rounded-xl border border-border p-4"
          >
            <summary
              class="cursor-pointer list-none text-sm font-semibold text-heading marker:hidden"
            >
              <span class="flex items-center justify-between gap-3">
                <span>{{ p.title }} · {{ p.version }}</span>
                <svg
                  class="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <p class="mt-4 whitespace-pre-line text-sm leading-7 text-body">
              {{ p.content }}
            </p>
          </details>
        </div>

        <template v-if="status && !status.policies_current">
          <div class="mt-5 space-y-3">
            <label class="flex items-start gap-3 text-sm leading-6 text-body">
              <input v-model="terms" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-navy-800 focus:ring-2 focus:ring-navy-500/30" />
              <span>I agree to the current Terms &amp; Conditions.</span>
            </label>
            <label class="flex items-start gap-3 text-sm leading-6 text-body">
              <input v-model="privacy" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-navy-800 focus:ring-2 focus:ring-navy-500/30" />
              <span>I acknowledge the current Privacy Policy and document review process.</span>
            </label>
          </div>
          <button
            :disabled="!terms || !privacy || busy || policies.length !== 2"
            class="btn-primary mt-5"
            @click="accept"
          >
            Save agreement
          </button>
        </template>
      </section>

      <MfaPanel @verified="run(load)" />
    </main>
  </UserLayout>
</template>
