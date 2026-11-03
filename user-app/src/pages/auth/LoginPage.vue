<script setup>
import { safeRedirect } from "@/utils/querySafety";
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "@/composables/useAuth";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { login, loginWithGoogle } = useAuth();

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function handleLogin() {
  error.value = "";
  loading.value = true;
  try {
    await login({ email: email.value, password: password.value });
    const redirect = safeRedirect(route.query.redirect);
    router.push(redirect);
  } catch (err) {
    error.value = err.message || "Login failed. Please check your credentials.";
  } finally {
    loading.value = false;
  }
}

async function handleGoogleLogin() {
  error.value = "";
  loading.value = true;
  try {
    await loginWithGoogle();
  } catch (err) {
    error.value = err.message || "Google sign-in failed.";
    loading.value = false;
  }
}
</script>

<template>
  <UserLayout>
    <main class="page-container">
      <div
        class="mx-auto grid max-w-5xl gap-10 py-4 lg:grid-cols-[1fr_420px] lg:items-center lg:py-12"
      >
        <section class="hidden lg:block">
          <p class="kicker">Welcome back</p>
          <h1
            class="mt-4 max-w-md font-display text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.035em] text-heading"
          >
            The room is open. Your next lot is waiting.
          </h1>
          <p class="mt-5 max-w-md text-sm leading-7 text-body">
            Sign in to follow live auctions, manage your bids and keep every
            payment in one place.
          </p>

          <ul class="mt-9 space-y-4">
            <li class="flex items-start gap-3">
              <span
                class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy-700"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.8"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-heading">
                  Every bid in one place
                </p>
                <p class="mt-0.5 text-sm leading-6 text-body">
                  Review active bids, outcomes and winning orders from your
                  account.
                </p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span
                class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gold-50 text-gold-700"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.8"
                    d="M12 3l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V6l7-3z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.8"
                    d="M9.5 12l1.8 1.8 3.4-3.6"
                  />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-heading">
                  Payment held until delivery
                </p>
                <p class="mt-0.5 text-sm leading-6 text-body">
                  Winning payments stay held until you confirm the item arrived
                  as described.
                </p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span
                class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-navy-700"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.8"
                    d="M8 10h8M8 14h5m-8 6h14a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1z"
                  />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-heading">
                  Support when something goes wrong
                </p>
                <p class="mt-0.5 text-sm leading-6 text-body">
                  Open a dispute from any order and track its resolution.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section>
          <div class="surface-panel p-6 sm:p-8">
            <p class="kicker lg:hidden">Welcome back</p>
            <h2
              class="mt-3 font-display text-2xl font-semibold tracking-[-0.02em] text-heading sm:text-3xl lg:mt-0"
            >
              {{ t("nav.login") }}
            </h2>
            <p class="mt-2 text-sm leading-6 text-body">
              Sign in to your CamboBid account.
            </p>

            <form class="mt-6 space-y-4" @submit.prevent="handleLogin">
              <div
                v-if="error"
                role="alert"
                class="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger"
              >
                {{ error }}
              </div>

              <BaseInput
                v-model="email"
                :label="t('profile.email')"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                required
              />

              <BaseInput
                v-model="password"
                label="Password"
                type="password"
                placeholder="Enter your password"
                autocomplete="current-password"
                required
              />

              <BaseButton
                type="submit"
                variant="primary"
                :loading="loading"
                class="w-full"
              >
                {{ t("nav.login") }}
              </BaseButton>
            </form>

            <div class="my-5 flex items-center gap-3">
              <div class="h-px flex-1 bg-border" />
              <span class="text-[11px] font-semibold uppercase tracking-widest text-muted">
                or
              </span>
              <div class="h-px flex-1 bg-border" />
            </div>

            <BaseButton
              variant="outline"
              :loading="loading"
              class="w-full"
              @click="handleGoogleLogin"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 01-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0012 22z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.4 14a6 6 0 010-3.9V7.5H3.1a10 10 0 000 9.1L6.4 14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 003.1 7.5l3.3 2.6C7.2 7.7 9.4 6 12 6z"
                />
              </svg>
              Continue with Google
            </BaseButton>

            <p class="mt-6 text-center text-sm text-body">
              Don't have an account?
              <router-link
                to="/register"
                class="font-semibold text-navy-700 transition-colors hover:text-navy-900"
              >
                {{ t("nav.register") }}
              </router-link>
            </p>
          </div>

          <p class="mt-4 px-1 text-center text-xs leading-5 text-muted">
            By continuing you agree to the
            <router-link to="/terms" class="underline hover:text-heading">
              Terms &amp; Conditions </router-link
            >and
            <router-link to="/privacy" class="underline hover:text-heading">
              Privacy Policy</router-link
            >.
          </p>
        </section>
      </div>
    </main>
  </UserLayout>
</template>
