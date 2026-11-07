<script setup>
import { useRoute, useRouter } from "vue-router";
import { usePermission } from "@/composables/usePermission";
import KhmerMark from "@/components/base/KhmerMark.vue";

defineProps({
  open: { type: Boolean, default: true },
});

const emit = defineEmits(["close"]);
const route = useRoute();
const router = useRouter();
const { can } = usePermission();

const groups = [
  {
    label: "Saleroom",
    items: [
      {
        name: "Dashboard",
        path: "/admin",
        icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      },
      {
        name: "Auctions",
        path: "/admin/auctions",
        icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
        permission: "auctions.read",
      },
      {
        name: "Listings",
        path: "/admin/listings",
        icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
        permission: "listings.read",
      },
      {
        name: "Categories",
        path: "/admin/cms/categories",
        icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
        permission: "categories.manage",
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        name: "Users",
        path: "/admin/users",
        icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
        permission: "users.read",
      },
      {
        name: "Bidders",
        path: "/admin/bidders",
        icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
        permission: "users.read",
      },
      {
        name: "Roles",
        path: "/admin/roles",
        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
        permission: "roles.manage",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        name: "Escrow",
        path: "/admin/escrow",
        icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
        permission: "escrow.read",
      },
      {
        name: "Withdrawals",
        path: "/admin/withdrawals",
        icon: "M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4",
        permission: "withdrawals.manage",
      },
      {
        name: "Disputes",
        path: "/admin/disputes",
        icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
        permission: "disputes.read",
      },
    ],
  },
  {
    label: "Publishing",
    items: [
      {
        name: "CMS Content",
        path: "/admin/settings",
        icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
        permission: "cms.manage",
      },
      {
        name: "Translations",
        path: "/admin/cms/translations",
        icon: "M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129",
        permission: "cms.manage",
      },
      {
        name: "Terms & Privacy",
        path: "/admin/policies",
        icon: "M9 12l2 2 4-4",
        permission: "cms.manage",
      },
      {
        name: "Presentation",
        path: "/admin/presentation",
        icon: "M5 3l14 9-14 9V3z",
        permission: "auctions.create",
      },
      {
        name: "Integrations",
        path: "/admin/integrations",
        icon: "M12 8v8m-4-4h8",
        permission: "roles.manage",
      },
    ],
  },
  {
    label: "Insight",
    items: [
      {
        name: "Analytics",
        path: "/admin/analytics",
        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
        permission: "analytics.read",
      },
      {
        name: "Activity Logs",
        path: "/admin/logs",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
        permission: "logs.read",
      },
    ],
  },
];

function isAllowed(item) {
  if (!item.permission) return true;
  const [resource, action] = item.permission.split(".");
  return can(action, resource);
}

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
      'admin-sidebar flex flex-col transition-all duration-300',
      open ? 'w-[248px]' : 'w-[72px]',
    ]"
  >
    <!-- Identity -->
    <div
      class="relative flex h-[68px] shrink-0 items-center border-b border-white/10 px-4"
    >
      <div
        class="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-gold-500/35 bg-white/5"
      >
        <KhmerMark
          variant="seal"
          color="#D2A343"
          :opacity="1"
          :stroke-width="1.2"
          class="h-6 w-6"
        />
      </div>
      <div v-if="open" class="ml-3 min-w-0">
        <p
          class="truncate font-display text-[19px] font-medium leading-none tracking-[-0.02em] text-white"
        >
          CamboBid
        </p>
        <p class="mt-1 text-[10.5px] tracking-[0.08em] text-gold-200/70">
          Administration
        </p>
      </div>
      <span
        class="absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/35 to-transparent"
        aria-hidden="true"
      />
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto overflow-x-hidden">
      <template v-for="group in groups" :key="group.label">
        <p v-if="open" class="nav-group-label">{{ group.label }}</p>
        <span
          v-else
          class="mx-3 my-2 block h-px bg-white/10"
          aria-hidden="true"
        />
        <button
          v-for="item in group.items"
          v-show="isAllowed(item)"
          :key="item.path"
          :class="['nav-item', { 'is-active': isActive(item.path) }]"
          :title="item.name"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          @click="navigate(item.path)"
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              :d="item.icon"
            />
          </svg>
          <span v-if="open" class="truncate">{{ item.name }}</span>
        </button>
      </template>
    </nav>

    <!-- Footer -->
    <div class="relative shrink-0 border-t border-white/10 p-2">
      <button
        class="nav-item"
        title="Back to public site"
        @click="router.push('/')"
      >
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        <span v-if="open">Back to site</span>
      </button>
      <KhmerMark
        v-if="open"
        variant="wave"
        color="#C08A2E"
        :opacity="0.14"
        class="pointer-events-none absolute inset-x-2 bottom-1 h-4 w-[calc(100%-16px)]"
      />
    </div>
  </div>
</template>
