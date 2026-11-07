<script setup>
import UserAvatar from "@/components/base/UserAvatar.vue";
import { useRoute } from "vue-router";
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useAuth } from "@/composables/useAuth";
import { notificationService } from "@/services/notificationService";

const emit = defineEmits(["toggle-sidebar", "toggle-mobile-sidebar"]);
const route = useRoute();

const { user, profile, logout } = useAuth();
const unreadCount = ref(0);
let notifChannel = null;

const sectionLabel = computed(() => {
  const parts = route.path.split("/").filter(Boolean);
  if (parts.length < 2) return "Dashboard";
  const last = parts[parts.length - 1];
  const map = {
    cms: "CMS",
    settings: "CMS Content",
    logs: "Activity Logs",
    policies: "Terms & Privacy",
    translations: "Translations",
    categories: "Categories",
    integrations: "Integrations",
  };
  return map[last] || last.replaceAll("-", " ");
});

const today = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
}).format(new Date());

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
  <header
    class="admin-topbar sticky top-0 z-30 flex items-center justify-between gap-4 border-b px-6"
  >
    <div class="flex min-w-0 items-center gap-3">
      <!-- Mobile toggle -->
      <button
        class="-ml-1 rounded-md p-2 text-body transition-colors hover:bg-navy-50 hover:text-heading lg:hidden"
        aria-label="Open navigation"
        @click="emit('toggle-mobile-sidebar')"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Desktop toggle -->
      <button
        class="hidden rounded-md p-2 text-body transition-colors hover:bg-navy-50 hover:text-heading lg:block"
        aria-label="Collapse navigation"
        @click="emit('toggle-sidebar')"
      >
        <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div class="hidden min-w-0 sm:block">
        <p class="flex items-center gap-2 text-[11px] text-muted">
          <span class="inline-block h-1 w-1 rounded-full bg-gold-500" aria-hidden="true" />
          Workspace
        </p>
        <p class="mt-0.5 truncate font-display text-[17px] font-medium capitalize leading-tight text-heading">
          {{ sectionLabel }}
        </p>
      </div>
      <p class="truncate font-display text-[15px] font-medium capitalize leading-tight text-heading sm:hidden">
        {{ sectionLabel }}
      </p>
    </div>

    <div class="flex items-center gap-2 sm:gap-4">
      <p class="hidden text-xs text-muted xl:block">
        <span class="numeric">{{ today }}</span>
      </p>

      <!-- Notifications -->
      <button
        class="relative rounded-md p-2 text-body transition-colors hover:bg-navy-50 hover:text-heading"
        aria-label="Notifications"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.6"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <span
          v-if="unreadCount > 0"
          class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-laterite px-1 font-mono text-[10px] font-medium text-white"
        >
          {{ unreadCount > 9 ? "9+" : unreadCount }}
        </span>
      </button>

      <!-- User -->
      <div class="admin-header-user flex items-center gap-3 pl-3 sm:pl-4">
        <div class="hidden text-right sm:block">
          <p class="text-[13px] font-medium leading-tight text-heading">
            {{ profile?.display_name || "Staff" }}
          </p>
          <p class="mt-0.5 text-[11px] capitalize leading-tight text-muted">
            {{ profile?.role?.replaceAll("_", " ") }}
          </p>
        </div>
        <UserAvatar :profile="profile" :user="user" class="h-8 w-8" />
        <button
          class="rounded-md p-2 text-muted transition-colors hover:bg-laterite/10 hover:text-laterite"
          title="Sign out"
          aria-label="Sign out"
          @click="handleLogout"
        >
          <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.6"
              d="M15 12H3m0 0l4-4m-4 4l4 4M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4"
            />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>
