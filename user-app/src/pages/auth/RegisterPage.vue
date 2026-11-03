<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "@/composables/useAuth";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { securityService } from "@/services/securityService";

const { t } = useI18n();
const router = useRouter();
const { register } = useAuth();

const displayName = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const termsAccepted = ref(false);
const error = ref("");
const loading = ref(false);
const success = ref(false);

async function handleRegister() {
  error.value = "";
  if (password.value !== confirmPassword.value) {
    error.value = "Passwords do not match.";
    return;
  }
  if (password.value.length < 8) {
    error.value = "Password must be at least 8 characters.";
    return;
  }
  if (!termsAccepted.value) {
    error.value = t("terms.accept_required");
    return;
  }
  loading.value = true;
  try {
    const terms = (await securityService.policies()).find(
      (p) => p.kind === "terms",
    );
    if (!terms?.version) {
      error.value = t("terms.unavailable");
      return;
    }
    await register({
      email: email.value,
      password: password.value,
      displayName: displayName.value,
      termsAcceptedVersion: terms.version,
    });
    success.value = true;
  } catch (err) {
    error.value = err.message || "Registration failed. Please try again.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UserLayout>
    <main class="page-container">
      <div
        class="mx-auto grid max-w-5xl gap-10 py-4 lg:grid-cols-[1fr_440px] lg:items-center lg:py-10"
      >
        <section class="hidden lg:block">
          <p class="kicker">Join CamboBid</p>
          <h1
            class="mt-4 max-w-md font-display text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.035em] text-heading"
          >
            Bid on objects worth keeping.
          </h1>
          <p class="mt-5 max-w-md text-sm leading-7 text-body">
            Create an account to bid in live auctions, buy instantly and follow
            every order from payment to delivery.
          </p>

          <dl class="mt-10 grid max-w-md grid-cols-2 gap-x-6 gap-y-5">
            <div class="border-l border-gold-300 pl-4">
              <dt class="text-[11px] font-medium uppercase tracking-wider text-muted">
                Bidding
              </dt>
              <dd class="mt-1 text-sm font-semibold text-heading">
                Straight or proxy
              </dd>
            </div>
            <div class="border-l border-gold-300 pl-4">
              <dt class="text-[11px] font-medium uppercase tracking-wider text-muted">
                Currency
              </dt>
              <dd class="mt-1 text-sm font-semibold text-heading">USD only</dd>
            </div>
            <div class="border-l border-gold-300 pl-4">
              <dt class="text-[11px] font-medium uppercase tracking-wider text-muted">
                Payment
              </dt>
              <dd class="mt-1 text-sm font-semibold text-heading">
                Held until delivery
              </dd>
            </div>
            <div class="border-l border-gold-300 pl-4">
              <dt class="text-[11px] font-medium uppercase tracking-wider text-muted">
                Support
              </dt>
              <dd class="mt-1 text-sm font-semibold text-heading">
                Dispute centre
              </dd>
            </div>
          </dl>

          <div class="mt-10 rounded-2xl border border-border bg-white p-5">
            <p class="text-sm leading-6 text-body">
              Bidding is a commitment. Every bid is final once placed, so review
              the lot details, condition and shipping notes before you confirm.
            </p>
          </div>
        </section>

        <section>
          <div class="surface-panel p-6 sm:p-8">
            <p class="kicker lg:hidden">Join CamboBid</p>
            <h2
              class="mt-3 font-display text-2xl font-semibold tracking-[-0.02em] text-heading sm:text-3xl lg:mt-0"
            >
              {{ t("nav.register") }}
            </h2>
            <p class="mt-2 text-sm leading-6 text-body">
              Create your account in a minute.
            </p>

            <div v-if="success" class="py-8 text-center">
              <div
                class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-success"
              >
                <svg
                  class="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 class="font-display text-lg font-semibold text-heading">
                Check your email
              </h3>
              <p class="mx-auto mt-2 max-w-xs text-sm leading-6 text-body">
                We've sent a confirmation link to
                <strong class="font-semibold text-heading">{{ email }}</strong
                >. Verify your email to continue.
              </p>
              <BaseButton
                variant="primary"
                class="mt-6"
                @click="router.push('/login')"
              >
                {{ t("nav.login") }}
              </BaseButton>
            </div>

            <form v-else class="mt-6 space-y-4" @submit.prevent="handleRegister">
              <div
                v-if="error"
                role="alert"
                class="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger"
              >
                {{ error }}
              </div>

              <BaseInput
                v-model="displayName"
                :label="t('profile.display_name')"
                placeholder="Your name"
                autocomplete="name"
                required
              />

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
                placeholder="At least 8 characters"
                autocomplete="new-password"
                hint="Use at least 8 characters."
                required
              />

              <BaseInput
                v-model="confirmPassword"
                label="Confirm password"
                type="password"
                placeholder="Re-enter your password"
                autocomplete="new-password"
                required
              />

              <label class="flex items-start gap-3 text-sm leading-6 text-body">
                <input
                  v-model="termsAccepted"
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-navy-800 focus:ring-2 focus:ring-navy-500/30"
                />
                <span>
                  {{ t("terms.accept_prefix") }}
                  <router-link
                    to="/terms"
                    target="_blank"
                    class="font-semibold text-navy-700 underline hover:text-navy-900"
                  >
                    {{ t("terms.title") }}
                  </router-link>
                  {{ t("terms.accept_suffix") }} I acknowledge the
                  <router-link
                    to="/privacy"
                    target="_blank"
                    class="font-semibold text-navy-700 underline hover:text-navy-900"
                    >Privacy Policy</router-link
                  >. Current policy versions are recorded after sign-in.
                </span>
              </label>

              <BaseButton
                type="submit"
                variant="primary"
                :loading="loading"
                class="w-full"
              >
                {{ t("nav.register") }}
              </BaseButton>
            </form>

            <p v-if="!success" class="mt-6 text-center text-sm text-body">
              Already have an account?
              <router-link
                to="/login"
                class="font-semibold text-navy-700 transition-colors hover:text-navy-900"
              >
                {{ t("nav.login") }}
              </router-link>
            </p>
          </div>
        </section>
      </div>
    </main>
  </UserLayout>
</template>
