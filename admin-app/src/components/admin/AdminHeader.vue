<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useAuth } from "@/composables/useAuth";
import { notificationService } from "@/services/notificationService";

const emit = defineEmits(["toggle-sidebar", "toggle-mobile-sidebar"]);

const { user, profile, logout } = useAuth();
const unreadCount = ref(0);
let notifChannel = null;

async function fetchUnreadCount() {
  if (user.value) {
    unreadCount.value = await notificationService.getUnreadCount();
  }
}

onMounted(async () => {
  await fetchUnreadCount();
  if (user.value) {
    notifChannel = await notificationService.subscribeToNotifications(() => {
      fetchUnreadCount();
    });
  }
});

onUnmounted(() => {
  notificationService.unsubscribeFromNotifications(notifChannel);
});

async function handleLogout() {
  await logout();
  window.location.href = "/admin/login";
}
</script>

<template>
  <header class="h-16 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
    <div class="flex items-center gap-4">
      <!-- Mobile toggle -->
      <button class="lg:hidden text-body" @click="emit('toggle-mobile-sidebar')">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Desktop toggle -->
      <button class="hidden lg:block text-body" @click="emit('toggle-sidebar')">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>

    <div class="flex items-center gap-4">
      <!-- Notifications -->
      <button class="relative p-2 text-body hover:text-navy-700 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span
          v-if="unreadCount > 0"
          class="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-danger text-white text-xs flex items-center justify-center font-medium"
        >
          {{ unreadCount > 9 ? "9+" : unreadCount }}
        </span>
      </button>

      <!-- User Menu -->
      <div class="flex items-center gap-3">
        <div class="text-right hidden sm:block">
          <p class="text-sm font-medium text-heading">{{ profile?.display_name }}</p>
          <p class="text-xs text-muted capitalize">{{ profile?.role?.replace("_", " ") }}</p>
        </div>
        <div class="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center">
          <span class="text-sm font-semibold text-white">
            {{ (profile?.display_name || "A").charAt(0).toUpperCase() }}
          </span>
        </div>
        <button
          class="text-sm text-muted hover:text-danger transition-colors"
          @click="handleLogout"
        >
          Logout
        </button>
      </div>
    </div>
  </header>
</template>
