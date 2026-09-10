<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "@/composables/useAuth";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";

const { t } = useI18n();
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
  <div class="min-h-screen bg-navy-900 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="w-16 h-16 rounded-2xl bg-gold-500 flex items-center justify-center mx-auto mb-4">
          <svg class="w-9 h-9 text-navy-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Admin Panel</h1>
        <p class="text-navy-300 mt-1">Sign in to your account</p>
      </div>

      <div class="bg-white rounded-xl p-8 shadow-xl">
        <form @submit.prevent="handleLogin" class="space-y-5">
          <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {{ error }}
          </div>

          <BaseInput
            v-model="email"
            label="Email"
            type="email"
            placeholder="admin@example.com"
            required
          />

          <BaseInput
            v-model="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            required
          />

          <BaseButton
            type="submit"
            :loading="loading"
            class="w-full"
            size="lg"
          >
            Sign In
          </BaseButton>
        </form>

        <div class="my-5 flex items-center gap-3">
          <div class="h-px flex-1 bg-border" />
          <span class="text-xs font-semibold uppercase tracking-widest text-muted">or</span>
          <div class="h-px flex-1 bg-border" />
        </div>

        <BaseButton variant="outline" :loading="loading" class="w-full" @click="handleGoogleLogin">
          Continue with Google
        </BaseButton>
      </div>
    </div>
  </div>
</template>
