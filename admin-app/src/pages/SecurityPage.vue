<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import MfaPanel from "@/components/base/MfaPanel.vue";
import { useAuthStore } from "@/stores/auth";
const router = useRouter(),
  auth = useAuthStore(),
  error = ref("");
async function complete() {
  try {
    await auth.refreshProfile();
    await router.push("/admin");
  } catch (e) {
    error.value = e.message;
  }
}
</script>
<template>
  <main class="mx-auto max-w-xl space-y-6 px-5 py-16">
    <h1 class="text-3xl font-bold">Secure your staff session</h1>
    <p class="text-slate-600">
      Administrators must enroll an authenticator and verify a code before
      accessing private records or changing platform data.
    </p>
    <MfaPanel @verified="complete" />
    <p v-if="error" role="alert">{{ error }}</p>
    <button
      class="text-blue-700 underline"
      @click="auth.logout().then(() => router.push('/admin/login'))"
    >
      Sign out
    </button>
  </main>
</template>
