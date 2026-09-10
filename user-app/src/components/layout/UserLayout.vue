<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { notificationService } from "@/services/notificationService";
import { platformSettingsService, defaultPlatformSettings } from "@/services/platformSettingsService";
import { useSettingsStore } from "@/stores/settings";
import LanguageSwitcher from "./LanguageSwitcher.vue";

const router = useRouter();
const { profile, isAuthenticated, isAdmin, logout } = useAuth();
const settingsStore = useSettingsStore();

const settings = ref(platformSettingsService.getCached());
const mobileMenuOpen = ref(false);
const profileDropdownOpen = ref(false);
const searchQuery = ref("");
const unreadCount = ref(0);
let notifChannel = null;

const categoryRail = [
  { label: "This week", icon: "M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", to: "/auctions" },
  { label: "For you", icon: "M5 3l14 9-14 9V3z", to: "/auctions?sort=ending_soon" },
  { label: "Trending", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", to: "/auctions?sort=price_desc" },
  { label: "Auctions", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8v8m0 0v1", to: "/auctions" },
  { label: "Art", icon: "M4 16l4-4 4 4 8-8", to: "/categories/art" },
  { label: "Jewellery", icon: "M12 3l7 8-7 10-7-10 7-8z", to: "/categories/jewelry" },
  { label: "Watches", icon: "M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z", to: "/categories/watches" },
  { label: "Fashion", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z", to: "/categories/fashion" },
  { label: "Collectibles", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10", to: "/categories/collectibles" },
];

async function fetchUnreadCount() {
  if (isAuthenticated.value) unreadCount.value = await notificationService.getUnreadCount();
}

function submitSearch() {
  if (!searchQuery.value.trim()) return;
  router.push({ path: "/search", query: { q: searchQuery.value.trim() } });
}

async function handleLogout() {
  await logout();
  profileDropdownOpen.value = false;
  router.push("/");
}

function navigate(path) {
  profileDropdownOpen.value = false;
  mobileMenuOpen.value = false;
  router.push(path);
}

onMounted(async () => {
  settings.value = await platformSettingsService.getAll();
  await fetchUnreadCount();
  if (isAuthenticated.value) {
    notifChannel = await notificationService.subscribeToNotifications(fetchUnreadCount);
  }
});

onUnmounted(() => notificationService.unsubscribeFromNotifications(notifChannel));
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#f4f6fb]">
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/80">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="h-20 flex items-center gap-5">
          <router-link to="/" class="flex items-center gap-3 shrink-0">
            <!-- Dynamic logo: use reactive store value (fetched on app startup) -->
            <img
              v-if="settingsStore.logoUrl"
              :src="settingsStore.logoUrl"
              alt="CamboBid"
              style="height: 40px; object-fit: contain; max-width: 160px;"
            />
            <template v-else>
              <div class="w-11 h-11 rounded-2xl bg-blue-700 flex items-center justify-center shadow-sm shadow-blue-700/25">
                <span class="w-6 h-6 rounded-full bg-white block" />
              </div>
              <div>
                <p class="text-2xl font-black tracking-tight text-blue-700 leading-none">{{ settings.brand.name }}</p>
                <p class="text-[11px] text-slate-500 hidden sm:block">{{ settings.brand.tagline }}</p>
              </div>
            </template>
          </router-link>

          <button class="hidden lg:inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Categories
            <svg class="w-4 h-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <form class="hidden md:flex flex-1" @submit.prevent="submitSearch">
            <label class="relative w-full">
              <svg class="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="searchQuery"
                class="w-full h-14 rounded-2xl border-0 bg-slate-100 pl-14 pr-5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                placeholder="Search for brand, model, artist..."
              />
            </label>
          </form>

          <nav class="hidden lg:flex items-center gap-5 text-sm font-semibold text-slate-700">
            <router-link to="/auctions/calendar" class="hover:text-blue-700">How it works?</router-link>
            <router-link to="/seller/listings/create" class="hover:text-blue-700">Sell</router-link>
            <router-link to="/disputes" class="hover:text-blue-700">Help</router-link>
          </nav>

          <div class="flex items-center gap-2 ml-auto">
            <router-link to="/profile/bids" class="hidden sm:grid w-11 h-11 place-items-center rounded-full hover:bg-slate-100 text-blue-700">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
              </svg>
            </router-link>
            <LanguageSwitcher />

            <template v-if="isAuthenticated">
              <router-link to="/notifications" class="relative grid w-11 h-11 place-items-center rounded-full hover:bg-slate-100 text-slate-700">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
                </svg>
                <span v-if="unreadCount" class="absolute -top-0.5 -right-0.5 min-w-5 h-5 rounded-full bg-rose-500 px-1 text-white text-xs grid place-items-center">{{ unreadCount > 9 ? "9+" : unreadCount }}</span>
              </router-link>

              <div class="relative">
                <button class="flex items-center gap-2 rounded-full bg-slate-100 p-1 pr-3 hover:bg-slate-200" @click="profileDropdownOpen = !profileDropdownOpen">
                  <div class="w-9 h-9 rounded-full bg-blue-700 text-white grid place-items-center font-bold">
                    {{ (profile?.display_name || "U").charAt(0).toUpperCase() }}
                  </div>
                  <span class="hidden sm:block text-sm font-semibold text-slate-700">{{ profile?.display_name || "Account" }}</span>
                </button>
                <div v-if="profileDropdownOpen" class="absolute right-0 mt-3 w-60 rounded-3xl bg-white shadow-xl border border-slate-200 p-2">
                  <button class="w-full text-left px-4 py-3 rounded-2xl text-sm hover:bg-slate-100" @click="navigate('/profile')">My profile</button>
                  <button class="w-full text-left px-4 py-3 rounded-2xl text-sm hover:bg-slate-100" @click="navigate('/seller/listings')">Seller studio</button>
                  <button class="w-full text-left px-4 py-3 rounded-2xl text-sm hover:bg-slate-100" @click="navigate('/orders')">Orders & escrow</button>
                  <a v-if="isAdmin" href="https://cambobidadmin.vercel.app" target="_blank" rel="noopener noreferrer" class="block w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold text-blue-700 hover:bg-blue-50">Admin panel</a>
                  <button class="w-full text-left px-4 py-3 rounded-2xl text-sm text-rose-600 hover:bg-rose-50" @click="handleLogout">Logout</button>
                </div>
              </div>
            </template>

            <template v-else>
              <router-link to="/login" class="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-slate-700 hover:text-blue-700">Sign in</router-link>
              <router-link to="/register" class="inline-flex items-center rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-800">Join now</router-link>
            </template>

            <button class="lg:hidden grid w-11 h-11 place-items-center rounded-full hover:bg-slate-100" @click="mobileMenuOpen = !mobileMenuOpen">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="hidden md:flex items-center justify-center gap-3 border-t border-slate-100 py-2 text-sm">
          <span class="font-semibold text-slate-800">{{ settings.brand.trust_score }}</span>
          <span class="inline-flex rounded-md overflow-hidden text-white bg-emerald-500 divide-x divide-white/30">
            <span v-for="i in 5" :key="i" class="px-1.5 py-0.5">★</span>
          </span>
          <span class="text-slate-600"><u>{{ settings.brand.review_count }} reviews</u> on</span>
          <span class="font-semibold text-slate-800">{{ settings.brand.review_source }}</span>
        </div>
      </div>

      <div class="bg-white border-t border-slate-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <div class="flex items-center gap-8 min-w-max py-5">
            <router-link
              v-for="item in categoryRail"
              :key="item.label"
              :to="item.to"
              class="group flex flex-col items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-700"
            >
              <svg class="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
              </svg>
              <span>{{ item.label }}</span>
            </router-link>
          </div>
        </div>
      </div>

      <div v-if="mobileMenuOpen" class="lg:hidden border-t border-slate-200 bg-white p-4 space-y-3">
        <form @submit.prevent="submitSearch">
          <input v-model="searchQuery" class="w-full h-12 rounded-2xl bg-slate-100 px-4 text-sm" placeholder="Search auctions..." />
        </form>
        <button class="block w-full text-left rounded-2xl px-4 py-3 hover:bg-slate-100" @click="navigate('/auctions')">Auctions</button>
        <button class="block w-full text-left rounded-2xl px-4 py-3 hover:bg-slate-100" @click="navigate('/seller/listings/create')">Sell an item</button>
        <button class="block w-full text-left rounded-2xl px-4 py-3 hover:bg-slate-100" @click="navigate('/auctions/calendar')">Calendar</button>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="bg-slate-950 text-white mt-auto">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div class="md:col-span-2">
          <p class="text-2xl font-black text-white">{{ settings.brand.name }}</p>
          <p class="mt-3 text-slate-400 max-w-md">{{ settings.brand.tagline }} with verified bidders, immutable logs, proxy bidding, and escrow protection.</p>
        </div>
        <div>
          <h4 class="font-bold mb-3">Marketplace</h4>
          <router-link to="/auctions" class="block text-sm text-slate-400 hover:text-white mb-2">Live auctions</router-link>
          <router-link to="/auctions/calendar" class="block text-sm text-slate-400 hover:text-white mb-2">Auction calendar</router-link>
          <router-link to="/seller/listings/create" class="block text-sm text-slate-400 hover:text-white">Sell with us</router-link>
        </div>
        <div>
          <h4 class="font-bold mb-3">Protection</h4>
          <router-link to="/verify-identity" class="block text-sm text-slate-400 hover:text-white mb-2">Bidder verification</router-link>
          <router-link to="/disputes" class="block text-sm text-slate-400 hover:text-white mb-2">Dispute resolution</router-link>
          <router-link to="/orders" class="block text-sm text-slate-400 hover:text-white">Escrow orders</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>
