<script setup>
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const router = useRouter();

async function handleLogout() {
  await authStore.logout();
  router.push("/admin/login");
}
</script>

<template>
  <div class="min-h-screen bg-navy-900 flex items-center justify-center p-4">
    <div class="w-full max-w-md text-center">
      <!-- Logo -->
      <div class="flex items-center justify-center gap-3 mb-10">
        <div class="w-12 h-12 rounded-2xl bg-gold-500 flex items-center justify-center shadow-lg">
          <svg class="w-7 h-7 text-navy-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span class="text-2xl font-black text-white tracking-tight">CamboBid</span>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-2xl p-10 shadow-2xl">
        <!-- Lock icon -->
        <div class="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h1 class="text-3xl font-bold text-gray-900 mb-3">Access Denied</h1>
        <p class="text-gray-500 leading-relaxed mb-8">
          This area is restricted to CamboBid staff only.<br />
          If you believe this is a mistake, contact your administrator.
        </p>

        <div class="flex flex-col gap-3">
          <a
            href="https://cambobid.vercel.app"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 py-3.5 text-sm font-bold text-white hover:bg-navy-800 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go to CamboBid
          </a>

          <button
            @click="handleLogout"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-6 py-3.5 text-sm font-bold text-gray-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      <p class="mt-6 text-navy-400 text-sm">
        Need help? Contact
        <a href="mailto:support@cambobid.com" class="text-gold-400 hover:underline">support@cambobid.com</a>
      </p>
    </div>
  </div>
</template>
