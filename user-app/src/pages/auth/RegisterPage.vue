<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "@/composables/useAuth";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";

const { t } = useI18n();
const router = useRouter();
const { register } = useAuth();

const displayName = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
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
  loading.value = true;
  try {
    await register({
      email: email.value,
      password: password.value,
      displayName: displayName.value,
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
    <div class="flex items-center justify-center min-h-[70vh] px-4 py-12">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-heading">{{ t("nav.register") }}</h1>
          <p class="text-sm text-muted mt-2">Create your account</p>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-border p-6">
          <div v-if="success" class="text-center py-8">
            <div class="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 class="text-lg font-semibold text-heading mb-2">Check Your Email</h2>
            <p class="text-sm text-muted mb-6">
              We've sent a confirmation link to <strong>{{ email }}</strong>. Please verify your email to continue.
            </p>
            <BaseButton variant="primary" @click="router.push('/login')">
              {{ t("nav.login") }}
            </BaseButton>
          </div>

          <form v-else @submit.prevent="handleRegister" class="space-y-4">
            <div v-if="error" class="p-3 rounded-lg bg-danger/10 text-danger text-sm">
              {{ error }}
            </div>

            <BaseInput
              v-model="displayName"
              :label="t('profile.display_name')"
              placeholder="John Doe"
              required
            />

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
              placeholder="At least 8 characters"
              required
            />

            <BaseInput
              v-model="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              required
            />

            <BaseButton type="submit" variant="primary" :loading="loading" class="w-full">
              {{ t("nav.register") }}
            </BaseButton>
          </form>

          <div v-if="!success" class="mt-6 text-center">
            <p class="text-sm text-muted">
              Already have an account?
              <router-link to="/login" class="font-medium text-navy-700 hover:text-navy-800">
                {{ t("nav.login") }}
              </router-link>
            </p>
          </div>
        </div>
      </div>
    </div>
  </UserLayout>
</template>
