<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import KhmerMark from "@/components/base/KhmerMark.vue";

const router = useRouter();
const { login, loginWithGoogle } = useAuth();

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = "Please fill in all fields";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    await login({ email: email.value, password: password.value });
    router.push("/admin");
  } catch (e) {
    error.value = e.message || "Invalid credentials";
  } finally {
    loading.value = false;
  }
}

async function handleGoogleLogin() {
  loading.value = true;
  error.value = "";
  try {
    await loginWithGoogle();
  } catch (e) {
    error.value = e.message || "Google sign-in failed";
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-paper lg:grid lg:grid-cols-[1.05fr_1fr]">
    <!-- Identity panel -->
    <aside class="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div
        class="pointer-events-none absolute -right-24 top-1/4 h-80 w-80 rounded-full border border-gold-500/10"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -right-10 top-1/4 h-56 w-56 rounded-full border border-gold-500/10"
        aria-hidden="true"
      />
      <KhmerMark
        variant="wave"
        color="#C08A2E"
        :opacity="0.18"
        class="pointer-events-none absolute inset-x-0 bottom-20 h-8 w-full"
      />

      <div class="relative">
        <div class="flex items-center gap-3">
          <div class="grid h-10 w-10 place-items-center rounded-md border border-gold-500/35 bg-white/5">
            <KhmerMark
              variant="seal"
              color="#D2A343"
              :opacity="1"
              :stroke-width="1.2"
              class="h-6 w-6"
            />
          </div>
          <div>
            <p class="font-display text-xl font-medium leading-none tracking-[-0.02em]">CamboBid</p>
            <p class="mt-1 text-[10.5px] tracking-[0.08em] text-gold-200/70">Administration</p>
          </div>
        </div>

        <h1 class="mt-16 max-w-md font-display text-[2.6rem] font-normal leading-[1.08] tracking-[-0.03em] text-white">
          The registrar's desk for a living saleroom.
        </h1>
        <p class="mt-5 max-w-sm text-sm leading-6 text-white/55">
          Catalogues, bids, settlement and disputes — one quiet room for the
          people who keep the auction moving.
        </p>
      </div>

      <div class="relative flex items-center justify-between text-xs text-white/40">
        <span>Phnom Penh</span>
        <span class="numeric">Est. 2026</span>
      </div>
    </aside>

    <!-- Form panel -->
    <main class="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
      <div class="w-full max-w-md">
        <div class="mb-8 flex items-center gap-3 lg:hidden">
          <div class="grid h-10 w-10 place-items-center rounded-md border border-gold-500/40 bg-ink">
            <KhmerMark
              variant="seal"
              color="#D2A343"
              :opacity="1"
              :stroke-width="1.2"
              class="h-6 w-6"
            />
          </div>
          <div>
            <p class="font-display text-xl font-medium leading-none tracking-[-0.02em] text-heading">CamboBid</p>
            <p class="mt-1 text-[10.5px] tracking-[0.08em] text-gold-700">Administration</p>
          </div>
        </div>

        <div class="rounded-xl border border-border bg-card p-6 sm:p-8">
          <p class="data-label flex items-center gap-2">
            <span class="inline-block h-1 w-1 rounded-full bg-gold-500" aria-hidden="true" />
            Staff access
          </p>
          <h2 class="mt-2 font-display text-[1.75rem] font-medium leading-tight text-heading">
            Sign in
          </h2>
          <p class="mt-1 text-sm text-muted">
            Use your CamboBid staff account to enter the workspace.
          </p>

          <form class="mt-6 space-y-5" @submit.prevent="handleLogin">
            <div
              v-if="error"
              role="alert"
              class="rounded-lg border border-laterite/25 bg-laterite/5 px-4 py-3 text-sm text-laterite"
            >
              {{ error }}
            </div>

            <BaseInput
              v-model="email"
              label="Email"
              type="email"
              placeholder="admin@cambobid.com"
              required
            />

            <BaseInput
              v-model="password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              required
            />

            <BaseButton type="submit" :loading="loading" class="w-full" size="lg">
              Sign in
            </BaseButton>
          </form>

          <div class="my-5 flex items-center gap-3">
            <div class="h-px flex-1 bg-border" />
            <span class="text-[11px] text-muted">or</span>
            <div class="h-px flex-1 bg-border" />
          </div>

          <BaseButton variant="outline" :loading="loading" class="w-full" @click="handleGoogleLogin">
            Continue with Google
          </BaseButton>
        </div>

        <p class="mt-6 text-center text-xs text-muted">
          Need access? Ask a super admin to invite you.
        </p>
      </div>
    </main>
  </div>
</template>
