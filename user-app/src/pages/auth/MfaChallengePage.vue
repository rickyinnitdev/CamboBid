<script setup>
import { safeRedirect } from "@/utils/querySafety";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import MfaPanel from "@/components/base/MfaPanel.vue";
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
  <main class="min-h-screen bg-slate-50 grid place-items-center p-6">
    <section class="w-full max-w-xl space-y-6">
      <router-link to="/" class="text-xl font-bold text-blue-800"
        >CamboBid</router-link
      >
      <div>
        <p class="text-sm text-slate-500">One more step</p>
        <h1 class="text-3xl font-bold mt-2">Verify your sign-in</h1>
        <p class="mt-3 text-slate-600">
          Enter the current six-digit code from your authenticator to continue
          to your account.
        </p>
      </div>
      <MfaPanel @verified="verified" />
      <p v-if="error" role="alert">{{ error }}</p>
      <button class="text-sm underline" @click="logout">
        Sign out and use another account
      </button>
    </section>
  </main>
</template>
