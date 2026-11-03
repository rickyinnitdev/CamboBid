<script setup>
import { safeRedirect } from "@/utils/querySafety";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import MfaPanel from "@/components/base/MfaPanel.vue";
import KhmerArchitecture from "@/components/base/KhmerArchitecture.vue";
import { useAuthStore } from "@/stores/auth";
const route = useRoute(),
  router = useRouter(),
  auth = useAuthStore(),
  error = ref("");
async function verified() {
  const target = safeRedirect(route.query.redirect);
  await router.replace(
    target.startsWith("/") &&
      !target.startsWith("//") &&
      !target.startsWith("/auth/verify")
      ? target
      : "/",
  );
}
async function logout() {
  try {
    await auth.logout();
    await router.replace("/login");
  } catch (e) {
    error.value = e.message;
  }
}
</script>
<template>
  <main class="relative grid min-h-screen place-items-center overflow-hidden bg-surface p-5 sm:p-8">
    <KhmerArchitecture variant="full" :opacity="0.06" />
    <section class="relative w-full max-w-lg">
      <router-link
        to="/"
        class="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
        aria-label="CamboBid home"
      >
        <span class="grid h-9 w-9 place-items-center rounded-xl bg-navy-900" aria-hidden="true">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path d="M12 4c2.2 3.1 2.2 6.2 0 9.3C9.8 10.2 9.8 7.1 12 4Z" stroke="#EAD3A2" stroke-width="1.4" />
            <path d="M12 13.3c-3-1.8-6-1.8-9 0 3 1.8 6 1.8 9 0Zm0 0c3-1.8 6-1.8 9 0-3 1.8-6 1.8-9 0Z" stroke="#EAD3A2" stroke-width="1.4" />
            <path d="M12 16.5c-1.4 1.2-2.9 1.7-4.5 1.5 1.1-1.6 2.6-2.1 4.5-1.5Zm0 0c1.4 1.2 2.9 1.7 4.5 1.5-1.1-1.6-2.6-2.1-4.5-1.5Z" stroke="#C08A2E" stroke-width="1.4" />
          </svg>
        </span>
        <span class="font-display text-xl font-semibold tracking-[-0.03em] text-navy-900">CamboBid</span>
      </router-link>

      <div class="mt-4 surface-panel p-6 sm:p-8">
        <p class="kicker">One more step</p>
        <h1 class="mt-3 font-display text-3xl font-semibold tracking-[-0.025em] text-heading">
          Verify your sign-in
        </h1>
        <p class="mt-3 text-sm leading-6 text-body">
          Enter the current six-digit code from your authenticator app to
          continue to your account.
        </p>

        <div class="mt-6">
          <MfaPanel @verified="verified" />
        </div>

        <p v-if="error" role="alert" class="mt-4 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          {{ error }}
        </p>

        <button
          class="mt-5 text-sm font-medium text-navy-700 underline transition-colors hover:text-navy-900"
          @click="logout"
        >
          Sign out and use another account
        </button>
      </div>

      <p class="mt-5 text-center text-xs leading-5 text-muted">
        Your session is protected with two-factor authentication.
      </p>
    </section>
  </main>
</template>
