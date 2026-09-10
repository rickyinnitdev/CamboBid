<script setup>
import { useRoute, useRouter } from "vue-router";
import { usePermission } from "@/composables/usePermission";

const props = defineProps({
  open: { type: Boolean, default: true },
});

const emit = defineEmits(["close"]);
const route = useRoute();
const router = useRouter();
const { can, isSuperAdmin, isAuctioneer, isEscrowManager } = usePermission();

const navigation = [
  { name: "Dashboard", path: "/admin", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { name: "Users", path: "/admin/users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", permission: "users.read" },
  { name: "Bidders", path: "/admin/bidders", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", permission: "users.read" },
  { name: "Roles", path: "/admin/roles", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", permission: "roles.manage" },
  { name: "Listings", path: "/admin/listings", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", permission: "listings.read" },
  { name: "Auctions", path: "/admin/auctions", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", permission: "auctions.read" },
  { name: "Escrow", path: "/admin/escrow", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z", permission: "escrow.read" },
  { name: "Disputes", path: "/admin/disputes", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", permission: "disputes.read" },
  { name: "Activity Logs", path: "/admin/logs", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", permission: "logs.read" },
  { name: "Analytics", path: "/admin/analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", permission: "analytics.read" },
  { name: "CMS", path: "/admin/cms/translations", icon: "M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129", permission: "cms.manage" },
  { name: "Categories", path: "/admin/cms/categories", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z", permission: "categories.manage" },
];

function isActive(path) {
  if (path === "/admin") return route.path === "/admin";
  return route.path.startsWith(path);
}

function navigate(path) {
  router.push(path);
  emit("close");
}
</script>

<template>
  <div
    :class="[
      'bg-navy-800 text-white flex flex-col transition-all duration-300',
      open ? 'w-60' : 'w-16',
    ]"
  >
    <!-- Logo -->
    <div class="h-16 flex items-center px-4 border-b border-navy-700">
      <div class="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5 text-navy-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <span v-if="open" class="ml-3 text-lg font-bold whitespace-nowrap">Admin</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-4 px-2 space-y-1">
      <template v-for="item in navigation" :key="item.path">
        <button
          v-if="!item.permission || can(item.permission.split('.')[1], item.permission.split('.')[0])"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive(item.path)
              ? 'bg-navy-700 text-white'
              : 'text-navy-200 hover:bg-navy-700/50 hover:text-white',
          ]"
          @click="navigate(item.path)"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
          </svg>
          <span v-if="open" class="whitespace-nowrap">{{ item.name }}</span>
        </button>
      </template>
    </nav>

    <!-- Back to Site -->
    <div class="p-2 border-t border-navy-700">
      <button
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-navy-200 hover:bg-navy-700/50 hover:text-white transition-colors"
        @click="router.push('/')"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span v-if="open">Back to Site</span>
      </button>
    </div>
  </div>
</template>
