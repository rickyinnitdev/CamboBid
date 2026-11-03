<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import UserAvatar from "@/components/base/UserAvatar.vue";
import PkarPattern from "@/components/base/PkarPattern.vue";
import { useAuth } from "@/composables/useAuth";
import { notificationService } from "@/services/notificationService";
import {
  platformSettingsService,
  defaultPlatformSettings,
} from "@/services/platformSettingsService";
import { useSettingsStore } from "@/stores/settings";
import { marketplace } from "@/data/marketplace";
import { timeAgo } from "@/utils/format";

const router = useRouter();
const route = useRoute();
const { user, profile, isAuthenticated, isAdmin, logout } = useAuth();
const settingsStore = useSettingsStore();

const settings = ref(platformSettingsService.getCached());
const mobileMenuOpen = ref(false);
const profileDropdownOpen = ref(false);
const categoriesOpen = ref(false);
const notificationPopoverOpen = ref(false);
const notificationPreview = ref([]);
const notificationPreviewLoading = ref(false);
const searchQuery = ref("");
const unreadCount = ref(0);
const categories = ref([]);
let notifChannel = null;

const notificationPopoverRef = ref(null);
const profileMenuRef = ref(null);
const categoriesRef = ref(null);

const fallbackCategories = [
  { name: "Watches", slug: "watches" },
  { name: "Jewellery", slug: "jewelry" },
  { name: "Art", slug: "art" },
  { name: "Collectibles", slug: "collectibles" },
  { name: "Antiques", slug: "antiques" },
  { name: "Books", slug: "books" },
  { name: "Vehicles", slug: "vehicles" },
  { name: "Handicrafts", slug: "handicrafts" },
];

const brandName = computed(
  () => settings.value.brand?.name || defaultPlatformSettings.brand.name,
);
const brandTagline = computed(
  () => settings.value.brand?.tagline || defaultPlatformSettings.brand.tagline,
);

const categoryMenu = computed(() =>
  categories.value.length ? categories.value : fallbackCategories,
);

function isActive(path, exact = false) {
  if (path === "/auctions") {
    return (
      route.path === "/auctions" ||
      (route.path.startsWith("/auctions/") &&
        !route.path.startsWith("/auctions/calendar"))
    );
  }
  if (exact) return route.path === path;
  return route.path === path || route.path.startsWith(`${path}/`);
}

function navClass(path, exact = false) {
  return isActive(path, exact)
    ? "bg-navy-50 text-navy-800"
    : "text-body hover:bg-surface hover:text-heading";
}

function categoryCount(category) {
  return category?.listings?.[0]?.count;
}

async function fetchUnreadCount() {
  if (isAuthenticated.value)
    unreadCount.value = await notificationService.getUnreadCount();
}

async function fetchNotificationPreview() {
  if (!isAuthenticated.value) return;

  notificationPreviewLoading.value = true;
  try {
    const result = await notificationService.getNotifications({ limit: 8 });
    notificationPreview.value = result.notifications || [];
  } catch (error) {
    if (import.meta.env.DEV)
      console.error("Failed to load notification preview:", error);
  } finally {
    notificationPreviewLoading.value = false;
  }
}

function getNotificationLink(notification) {
  return notification.auction_id
    ? `/auctions/${notification.auction_id}`
    : "/notifications";
}

function getNotificationTitle(notification) {
  return notification.title || notification.type || "Notification";
}

function getNotificationBody(notification) {
  return notification.body || notification.message || "";
}

async function toggleNotificationPopover() {
  notificationPopoverOpen.value = !notificationPopoverOpen.value;
  profileDropdownOpen.value = false;
  categoriesOpen.value = false;
  if (notificationPopoverOpen.value) await fetchNotificationPreview();
}

async function markNotificationRead(notification, event) {
  event?.stopPropagation();
  try {
    await notificationService.markAsRead(notification.id);
    notification.read = true;
    await fetchUnreadCount();
  } catch (error) {
    if (import.meta.env.DEV)
      console.error("Failed to mark notification as read:", error);
  }
}

async function dismissNotification(notification, event) {
  event?.stopPropagation();
  try {
    await notificationService.deleteNotification(notification.id);
    notificationPreview.value = notificationPreview.value.filter(
      (item) => item.id !== notification.id,
    );
    if (!notification.read) await fetchUnreadCount();
  } catch (error) {
    if (import.meta.env.DEV)
      console.error("Failed to dismiss notification:", error);
  }
}

async function markAllNotificationsRead() {
  try {
    await notificationService.markAllAsRead();
    notificationPreview.value.forEach((notification) => {
      notification.read = true;
    });
    unreadCount.value = 0;
  } catch (error) {
    if (import.meta.env.DEV)
      console.error("Failed to mark all notifications as read:", error);
  }
}

function openNotification(notification) {
  notificationPopoverOpen.value = false;
  router.push(getNotificationLink(notification));
}

function handleDocumentClick(event) {
  if (
    notificationPopoverOpen.value &&
    !notificationPopoverRef.value?.contains(event.target)
  )
    notificationPopoverOpen.value = false;
  if (
    profileDropdownOpen.value &&
    !profileMenuRef.value?.contains(event.target)
  )
    profileDropdownOpen.value = false;
  if (categoriesOpen.value && !categoriesRef.value?.contains(event.target))
    categoriesOpen.value = false;
}

function handleKeydown(event) {
  if (event.key !== "Escape") return;
  notificationPopoverOpen.value = false;
  profileDropdownOpen.value = false;
  categoriesOpen.value = false;
  mobileMenuOpen.value = false;
}

function submitSearch() {
  const query = searchQuery.value.trim();
  if (!query) return;
  mobileMenuOpen.value = false;
  router.push({ path: "/search", query: { q: query } });
}

async function handleLogout() {
  await logout();
  profileDropdownOpen.value = false;
  mobileMenuOpen.value = false;
  router.push("/");
}

function navigate(path) {
  profileDropdownOpen.value = false;
  categoriesOpen.value = false;
  mobileMenuOpen.value = false;
  router.push(path);
}

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false;
    profileDropdownOpen.value = false;
    categoriesOpen.value = false;
    notificationPopoverOpen.value = false;
  },
);

onMounted(async () => {
  platformSettingsService
    .getAll()
    .then((data) => {
      settings.value = data;
    })
    .catch(() => {});

  try {
    categories.value = await marketplace.getCategories();
  } catch (error) {
    if (import.meta.env.DEV)
      console.error("Failed to load categories:", error);
  }
  try {
    await fetchUnreadCount();
  } catch (error) {
    if (import.meta.env.DEV)
      console.error("Failed to load unread count:", error);
  }
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleKeydown);
  if (isAuthenticated.value) {
    try {
      notifChannel =
        await notificationService.subscribeToNotifications(fetchUnreadCount);
    } catch (error) {
      if (import.meta.env.DEV)
        console.error("Failed to subscribe to notifications:", error);
    }
  }
});

onUnmounted(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleKeydown);
  notificationService.unsubscribeFromNotifications(notifChannel);
});
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
    >
      Skip to content
    </a>

    <header
      class="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md"
    >
      <div class="container-page">
        <div class="flex h-[72px] items-center gap-4">
          <router-link
            to="/"
            class="focus-ring flex shrink-0 items-center gap-2.5 rounded-lg"
            aria-label="CamboBid home"
          >
            <img
              v-if="settingsStore.logoUrl"
              :src="settingsStore.logoUrl"
              :alt="brandName"
              class="h-9 w-auto max-w-[150px] object-contain"
            />
            <template v-else>
              <span
                class="grid h-9 w-9 place-items-center rounded-xl bg-navy-900"
                aria-hidden="true"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 4c2.2 3.1 2.2 6.2 0 9.3C9.8 10.2 9.8 7.1 12 4Z"
                    stroke="#EAD3A2"
                    stroke-width="1.4"
                  />
                  <path
                    d="M12 13.3c-3-1.8-6-1.8-9 0 3 1.8 6 1.8 9 0Zm0 0c3-1.8 6-1.8 9 0-3 1.8-6 1.8-9 0Z"
                    stroke="#EAD3A2"
                    stroke-width="1.4"
                  />
                  <path
                    d="M12 16.5c-1.4 1.2-2.9 1.7-4.5 1.5 1.1-1.6 2.6-2.1 4.5-1.5Zm0 0c1.4 1.2 2.9 1.7 4.5 1.5-1.1-1.6-2.6-2.1-4.5-1.5Z"
                    stroke="#C08A2E"
                    stroke-width="1.4"
                  />
                </svg>
              </span>
              <span class="flex flex-col leading-none">
                <span
                  class="font-display text-[21px] font-semibold tracking-[-0.03em] text-navy-900"
                  >{{ brandName }}</span
                >
                <span class="mt-1 hidden text-[10px] text-muted xl:block">{{
                  brandTagline
                }}</span>
              </span>
            </template>
          </router-link>

          <nav
            class="ml-2 hidden items-center gap-0.5 lg:flex"
            aria-label="Primary navigation"
          >
            <router-link
              to="/auctions"
              :class="[
                'focus-ring rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                navClass('/auctions'),
              ]"
            >
              Auctions
            </router-link>

            <div ref="categoriesRef" class="relative">
              <button
                type="button"
                :class="[
                  'focus-ring inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  categoriesOpen
                    ? 'bg-navy-50 text-navy-800'
                    : 'text-body hover:bg-surface hover:text-heading',
                ]"
                :aria-expanded="categoriesOpen"
                aria-haspopup="true"
                @click="
                  categoriesOpen = !categoriesOpen;
                  profileDropdownOpen = false;
                  notificationPopoverOpen = false;
                "
              >
                Categories
                <svg
                  :class="[
                    'h-3.5 w-3.5 transition-transform',
                    categoriesOpen && 'rotate-180',
                  ]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              <Transition
                enter-active-class="duration-150 ease-out"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="duration-100 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
              >
                <div
                  v-if="categoriesOpen"
                  class="absolute left-0 top-full z-50 mt-2 w-[420px] rounded-2xl border border-border bg-white p-3 shadow-lg"
                >
                  <div class="grid grid-cols-2 gap-1">
                    <router-link
                      v-for="category in categoryMenu"
                      :key="category.slug"
                      :to="`/categories/${category.slug}`"
                      class="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-surface"
                    >
                      <span class="text-sm font-medium text-heading">{{
                        category.name
                      }}</span>
                      <span
                        v-if="categoryCount(category) !== undefined"
                        class="text-xs text-muted"
                        >{{ categoryCount(category) }}</span
                      >
                      <svg
                        v-else
                        class="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-navy-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </router-link>
                  </div>
                  <div class="mt-2 border-t border-border pt-2">
                    <router-link
                      to="/auctions"
                      class="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-navy-700 hover:bg-surface"
                      @click="categoriesOpen = false"
                    >
                      Browse all auctions
                      <span aria-hidden="true">→</span>
                    </router-link>
                  </div>
                </div>
              </Transition>
            </div>

            <router-link
              to="/auctions/calendar"
              :class="[
                'focus-ring rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                navClass('/auctions/calendar', true),
              ]"
            >
              Calendar
            </router-link>
            <router-link
              to="/seller/listings/create"
              :class="[
                'focus-ring rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                navClass('/seller'),
              ]"
            >
              Sell
            </router-link>
          </nav>

          <form
            class="ml-auto hidden w-full max-w-[300px] md:block"
            role="search"
            @submit.prevent="submitSearch"
          >
            <label class="relative block">
              <span class="sr-only">Search auctions</span>
              <svg
                class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                v-model="searchQuery"
                type="search"
                class="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-heading placeholder:text-slate-400 transition-colors focus:border-navy-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/15"
                placeholder="Search lots, makers, eras"
              />
            </label>
          </form>

          <div class="ml-auto flex items-center gap-1 md:ml-2">
            <template v-if="isAuthenticated">
              <div ref="notificationPopoverRef" class="relative">
                <button
                  type="button"
                  class="focus-ring relative grid h-10 w-10 place-items-center rounded-lg text-body transition-colors hover:bg-surface hover:text-heading"
                  :aria-expanded="notificationPopoverOpen"
                  aria-label="Open notifications"
                  @click="toggleNotificationPopover"
                >
                  <svg
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.8"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <span
                    v-if="unreadCount"
                    class="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-navy-900"
                    >{{ unreadCount > 9 ? "9+" : unreadCount }}</span
                  >
                </button>

                <Transition
                  enter-active-class="duration-150 ease-out"
                  enter-from-class="opacity-0 -translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="duration-100 ease-in"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 -translate-y-1"
                >
                  <div
                    v-if="notificationPopoverOpen"
                    class="absolute right-0 top-full z-50 mt-2 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-lg"
                  >
                    <div
                      class="flex items-center justify-between border-b border-border px-4 py-3"
                    >
                      <h2 class="font-display text-sm font-semibold text-heading">
                        Notifications
                      </h2>
                      <button
                        type="button"
                        class="text-xs font-semibold text-navy-700 hover:text-navy-900 disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="!unreadCount"
                        @click="markAllNotificationsRead"
                      >
                        Mark all read
                      </button>
                    </div>

                    <div class="max-h-96 overflow-y-auto">
                      <div
                        v-if="notificationPreviewLoading"
                        class="space-y-3 p-4"
                      >
                        <div
                          v-for="i in 4"
                          :key="i"
                          class="h-14 animate-pulse rounded-xl bg-slate-100"
                        />
                      </div>

                      <div
                        v-else-if="notificationPreview.length === 0"
                        class="px-4 py-10 text-center text-sm text-muted"
                      >
                        No new notifications
                      </div>

                      <div
                        v-for="notification in notificationPreview"
                        v-else
                        :key="notification.id"
                        class="flex w-full cursor-pointer items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-surface"
                        :class="!notification.read && 'bg-navy-50/50'"
                        role="button"
                        tabindex="0"
                        @click="openNotification(notification)"
                        @keydown.enter="openNotification(notification)"
                      >
                        <span
                          class="relative mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full"
                          :class="
                            notification.read
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-navy-100 text-navy-700'
                          "
                        >
                          <span
                            v-if="!notification.read"
                            class="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold-500 ring-2 ring-white"
                          />
                          <svg
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.8"
                              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                            />
                          </svg>
                        </span>
                        <span class="min-w-0 flex-1">
                          <span
                            class="block truncate text-sm font-semibold text-heading"
                            >{{ getNotificationTitle(notification) }}</span
                          >
                          <span
                            v-if="getNotificationBody(notification)"
                            class="mt-0.5 line-clamp-2 block text-xs leading-5 text-body"
                            >{{ getNotificationBody(notification) }}</span
                          >
                          <span class="mt-1 block text-[11px] text-muted">{{
                            timeAgo(notification.created_at)
                          }}</span>
                        </span>
                        <span class="flex flex-shrink-0 items-center gap-1 self-center">
                          <button
                            v-if="!notification.read"
                            type="button"
                            class="rounded px-1.5 py-1 text-[10px] font-semibold text-navy-700 hover:bg-navy-50"
                            @click="markNotificationRead(notification, $event)"
                          >
                            Read
                          </button>
                          <button
                            type="button"
                            class="rounded px-1.5 py-1 text-[10px] font-semibold text-muted hover:bg-red-50 hover:text-red-700"
                            @click="dismissNotification(notification, $event)"
                          >
                            Dismiss
                          </button>
                        </span>
                      </div>
                    </div>

                    <div class="border-t border-border bg-surface px-4 py-3 text-center">
                      <button
                        type="button"
                        class="text-sm font-semibold text-navy-700 hover:text-navy-900"
                        @click="navigate('/notifications')"
                      >
                        View all notifications
                      </button>
                    </div>
                  </div>
                </Transition>
              </div>

              <div ref="profileMenuRef" class="relative">
                <button
                  type="button"
                  class="focus-ring flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-surface sm:pr-2.5"
                  :aria-expanded="profileDropdownOpen"
                  aria-label="Open account menu"
                  @click="
                    profileDropdownOpen = !profileDropdownOpen;
                    notificationPopoverOpen = false;
                    categoriesOpen = false;
                  "
                >
                  <UserAvatar :profile="profile" :user="user" class="h-8 w-8" />
                  <span class="hidden max-w-[110px] truncate text-sm font-medium text-heading sm:block">
                    {{ profile?.display_name || "Account" }}
                  </span>
                  <svg
                    class="hidden h-3.5 w-3.5 text-muted sm:block"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <Transition
                  enter-active-class="duration-150 ease-out"
                  enter-from-class="opacity-0 -translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="duration-100 ease-in"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 -translate-y-1"
                >
                  <div
                    v-if="profileDropdownOpen"
                    class="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-border bg-white p-2 shadow-lg"
                  >
                    <div class="border-b border-border px-3 py-2.5">
                      <p class="truncate text-sm font-semibold text-heading">
                        {{ profile?.display_name || "Your account" }}
                      </p>
                      <p class="mt-0.5 truncate text-xs text-muted">
                        {{ user?.email }}
                      </p>
                    </div>
                    <div class="py-1">
                      <button class="menu-item" @click="navigate('/profile')">My profile</button>
                      <button class="menu-item" @click="navigate('/profile/bids')">Bid history</button>
                      <button class="menu-item" @click="navigate('/orders')">Wins &amp; purchases</button>
                      <button class="menu-item" @click="navigate('/wallet')">Wallet</button>
                    </div>
                    <div class="border-t border-border py-1">
                      <button class="menu-item" @click="navigate('/seller/listings')">Seller studio</button>
                      <button class="menu-item" @click="navigate('/documents')">Invoices &amp; receipts</button>
                      <button class="menu-item" @click="navigate('/account/security')">Security &amp; verification</button>
                    </div>
                    <div class="border-t border-border py-1">
                      <a
                        v-if="isAdmin"
                        href="https://cambobidadmin.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="menu-item font-semibold text-navy-700"
                        >Admin panel</a
                      >
                      <button
                        class="menu-item text-red-700 hover:bg-red-50 hover:text-red-800"
                        @click="handleLogout"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </Transition>
              </div>
            </template>

            <template v-else>
              <router-link
                to="/login"
                class="focus-ring hidden rounded-lg px-3 py-2 text-sm font-medium text-body transition-colors hover:bg-surface hover:text-heading sm:inline-flex"
                >Sign in</router-link
              >
              <router-link
                to="/register"
                class="focus-ring inline-flex items-center rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
                >Join</router-link
              >
            </template>

            <button
              type="button"
              class="focus-ring grid h-10 w-10 place-items-center rounded-lg text-heading transition-colors hover:bg-surface lg:hidden"
              :aria-expanded="mobileMenuOpen"
              aria-label="Toggle navigation menu"
              @click="mobileMenuOpen = !mobileMenuOpen"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  v-if="!mobileMenuOpen"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                  d="M4 7h16M4 12h16M4 17h16"
                />
                <path
                  v-else
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <Transition
        enter-active-class="duration-150 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div
          v-if="mobileMenuOpen"
          class="border-t border-border bg-white lg:hidden"
        >
          <div class="container-page space-y-4 py-4">
            <form role="search" @submit.prevent="submitSearch">
              <label class="relative block">
                <span class="sr-only">Search auctions</span>
                <svg
                  class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  v-model="searchQuery"
                  type="search"
                  class="h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-heading placeholder:text-slate-400 focus:border-navy-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/15"
                  placeholder="Search lots, makers, eras"
                />
              </label>
            </form>

            <nav class="grid gap-1" aria-label="Mobile navigation">
              <button
                :class="['mobile-link', isActive('/auctions') && 'mobile-link-active']"
                :aria-current="isActive('/auctions') ? 'page' : undefined"
                @click="navigate('/auctions')"
              >
                Auctions
              </button>
              <button
                :class="[
                  'mobile-link',
                  isActive('/auctions/calendar', true) && 'mobile-link-active',
                ]"
                :aria-current="
                  isActive('/auctions/calendar', true) ? 'page' : undefined
                "
                @click="navigate('/auctions/calendar')"
              >
                Auction calendar
              </button>
              <button
                :class="['mobile-link', isActive('/seller') && 'mobile-link-active']"
                :aria-current="isActive('/seller') ? 'page' : undefined"
                @click="navigate('/seller/listings/create')"
              >
                Sell an item
              </button>
              <button
                :class="[
                  'mobile-link',
                  isActive('/profile/bids') && 'mobile-link-active',
                ]"
                :aria-current="
                  isActive('/profile/bids') ? 'page' : undefined
                "
                @click="navigate('/profile/bids')"
              >
                Bid history
              </button>
              <button
                :class="['mobile-link', isActive('/orders') && 'mobile-link-active']"
                :aria-current="isActive('/orders') ? 'page' : undefined"
                @click="navigate('/orders')"
              >
                Wins &amp; purchases
              </button>
            </nav>

            <div class="border-t border-border pt-4">
              <p class="mb-2 text-xs font-medium text-muted">Categories</p>
              <div class="grid grid-cols-2 gap-1">
                <router-link
                  v-for="category in categoryMenu"
                  :key="category.slug"
                  :to="`/categories/${category.slug}`"
                  class="focus-ring rounded-lg px-3 py-2 text-sm text-body hover:bg-surface hover:text-heading"
                >
                  {{ category.name }}
                </router-link>
              </div>
            </div>

            <div v-if="!isAuthenticated" class="flex gap-2 border-t border-border pt-4">
              <router-link
                to="/login"
                class="focus-ring flex-1 rounded-lg border border-line px-4 py-2.5 text-center text-sm font-semibold text-heading"
                >Sign in</router-link
              >
              <router-link
                to="/register"
                class="focus-ring flex-1 rounded-lg bg-navy-900 px-4 py-2.5 text-center text-sm font-semibold text-white"
                >Join CamboBid</router-link
              >
            </div>
            <button
              v-else
              class="focus-ring w-full rounded-lg border border-line px-4 py-2.5 text-left text-sm font-semibold text-red-700"
              @click="handleLogout"
            >
              Sign out
            </button>
          </div>
        </div>
      </Transition>
    </header>

    <main id="main-content" class="relative flex-1">
      <slot />
    </main>

    <footer class="relative mt-auto overflow-hidden bg-navy-900 text-white">
      <span
        class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/70 to-transparent"
        aria-hidden="true"
      />
      <PkarPattern
        color="#EAD3A2"
        variant="temple"
        :opacity="0.045"
        :scale="96"
      />
      <div class="container-page relative">
        <div class="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p class="font-display text-2xl font-semibold tracking-[-0.03em]">
              {{ brandName }}
            </p>
            <p class="mt-3 max-w-sm text-sm leading-6 text-navy-200">
              Timed auctions for watches, jewellery, art and collectibles.
              Clear lot details, visible bid history and payment held until
              delivery is confirmed.
            </p>
            <p class="mt-6 text-xs text-navy-300">
              English · USD
            </p>
          </div>

          <div>
            <h2 class="text-sm font-semibold text-white">Marketplace</h2>
            <ul class="mt-4 space-y-2.5 text-sm text-navy-200">
              <li><router-link to="/auctions" class="footer-link">All auctions</router-link></li>
              <li><router-link to="/auctions/calendar" class="footer-link">Auction calendar</router-link></li>
              <li><router-link to="/seller/listings/create" class="footer-link">Sell an item</router-link></li>
              <li><router-link to="/auctions?status=closed" class="footer-link">Past results</router-link></li>
            </ul>
          </div>

          <div>
            <h2 class="text-sm font-semibold text-white">Your account</h2>
            <ul class="mt-4 space-y-2.5 text-sm text-navy-200">
              <li><router-link to="/profile/bids" class="footer-link">Bid history</router-link></li>
              <li><router-link to="/orders" class="footer-link">Wins &amp; purchases</router-link></li>
              <li><router-link to="/wallet" class="footer-link">Wallet</router-link></li>
              <li><router-link to="/documents" class="footer-link">Invoices &amp; receipts</router-link></li>
            </ul>
          </div>

          <div>
            <h2 class="text-sm font-semibold text-white">Help &amp; legal</h2>
            <ul class="mt-4 space-y-2.5 text-sm text-navy-200">
              <li><router-link to="/disputes" class="footer-link">Dispute centre</router-link></li>
              <li><router-link to="/verify-identity" class="footer-link">Bidder verification</router-link></li>
              <li><router-link to="/terms" class="footer-link">Terms &amp; conditions</router-link></li>
              <li><router-link to="/privacy" class="footer-link">Privacy policy</router-link></li>
            </ul>
          </div>
        </div>

        <div
          class="flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-navy-300 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>© {{ new Date().getFullYear() }} {{ brandName }}. All rights reserved.</p>
          <p>Cambodia · Online auction marketplace</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.menu-item {
  display: block;
  width: 100%;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  color: #475467;
  transition: background-color 150ms ease, color 150ms ease;
}

.menu-item:hover {
  background-color: #f6f7f9;
  color: #0b1b2b;
}

.mobile-link {
  display: block;
  border-radius: 0.5rem;
  padding: 0.625rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 500;
  color: #0b1b2b;
  transition: background-color 150ms ease;
}

.mobile-link:hover {
  background-color: #f6f7f9;
}

.mobile-link:focus-visible {
  outline: 2px solid #163e5f;
  outline-offset: 2px;
}

.mobile-link-active {
  background-color: #eef2f6;
  font-weight: 600;
}

.footer-link {
  transition: color 150ms ease;
}

.footer-link:hover {
  color: #ffffff;
}
</style>
