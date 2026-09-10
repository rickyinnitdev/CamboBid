<script setup>
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
    const redirect = route.query.redirect || "/";
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
    <div class="flex items-center justify-center min-h-[70vh] px-4 py-12">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-heading">{{ t("nav.login") }}</h1>
          <p class="text-sm text-muted mt-2">Sign in to your account</p>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-border p-6">
          <form @submit.prevent="handleLogin" class="space-y-4">
            <div v-if="error" class="p-3 rounded-lg bg-danger/10 text-danger text-sm">
              {{ error }}
            </div>

            <BaseInput
              v-model="email"
              :label="t('profile.email')"
              type="email"
              placeholder="you@example.com"
              required
            />

            <BaseInput
              v-model="password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              required
            />

            <BaseButton type="submit" variant="primary" :loading="loading" class="w-full">
              {{ t("nav.login") }}
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

          <div class="mt-6 text-center">
            <p class="text-sm text-muted">
              Don't have an account?
              <router-link to="/register" class="font-medium text-navy-700 hover:text-navy-800">
                {{ t("nav.register") }}
              </router-link>
            </p>
          </div>
        </div>
      </div>
    </div>
  </UserLayout>
</template>
