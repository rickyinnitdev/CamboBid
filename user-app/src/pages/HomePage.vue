<script setup>
import { ref, onMounted } from "vue";
import UserLayout from "@/components/layout/UserLayout.vue";
import AuctionCard from "@/components/auction/AuctionCard.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import { auctionService } from "@/services/auctionService";
import { listingService } from "@/services/listingService";
import { searchService } from "@/services/searchService";
import { platformSettingsService, defaultPlatformSettings } from "@/services/platformSettingsService";

const settings = ref(defaultPlatformSettings);
const liveAuctions = ref([]);
const featuredListings = ref([]);
const categories = ref([]);
const loading = ref(true);

const featuredCategories = [
  { name: "Watches", slug: "watches", tone: "from-slate-950 to-blue-900", icon: "M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { name: "Jewellery", slug: "jewelry", tone: "from-amber-500 to-orange-600", icon: "M12 3l7 8-7 10-7-10 7-8z" },
  { name: "Art", slug: "art", tone: "from-fuchsia-600 to-blue-700", icon: "M4 16l4-4 4 4 8-8" },
  { name: "Interiors", slug: "antiques", tone: "from-emerald-700 to-teal-500", icon: "M4 6h16M4 10h16M6 14h12M8 18h8" },
  { name: "Collectibles", slug: "collectibles", tone: "from-rose-600 to-red-500", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" },
  { name: "Cars", slug: "vehicles", tone: "from-sky-700 to-cyan-500", icon: "M3 13l2-5a2 2 0 011.9-1.37h10.2A2 2 0 0119 8l2 5M5 13h14v6H5v-6z" },
];

const featureBlocks = [
  { title: "Real-time bidding", body: "Watch bids move instantly through Supabase Realtime channels.", stat: "WebSocket live" },
  { title: "Proxy bidding", body: "Buyers can set a hidden maximum and let the engine bid safely.", stat: "Max hidden" },
  { title: "Escrow protected", body: "Winning payments are held until delivery, release, refund, or dispute resolution.", stat: "Finance safe" },
  { title: "Anti-sniping timer", body: "Late bids automatically extend auctions to keep competition fair.", stat: "+5 min" },
];

onMounted(async () => {
  try {
    const [settingsData, liveData, featuredData, catData] = await Promise.all([
      platformSettingsService.getAll(),
      auctionService.getLiveAuctions(),
      listingService.getFeaturedListings(6),
      searchService.getCategories(),
    ]);

    settings.value = settingsData;
    liveAuctions.value = liveData.slice(0, 4);
    featuredListings.value = featuredData;
    categories.value = catData;
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load home page data:", err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <UserLayout>
    <section class="relative overflow-hidden bg-[#eef2f8]">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(37,99,235,0.15),transparent_30%),radial-gradient(circle_at_85%_25%,rgba(232,160,32,0.18),transparent_28%)]" />
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div class="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p class="font-mono text-xs uppercase tracking-[0.35em] text-slate-700 mb-5">7 - 13 September 2026</p>
            <div class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm border border-slate-200 mb-6">
              <span class="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span class="text-sm font-bold text-slate-800">{{ settings.homepage.hero_eyebrow }}</span>
            </div>
            <h1 class="max-w-2xl text-5xl sm:text-6xl lg:text-7xl font-black tracking-[-0.06em] leading-[0.9] text-slate-950">
              {{ settings.homepage.hero_title }}
            </h1>
            <p class="mt-6 max-w-xl text-lg leading-8 text-slate-700">
              {{ settings.homepage.hero_subtitle }}
            </p>
            <p class="mt-6 text-blue-700 font-bold">{{ settings.homepage.hero_promo }}</p>
            <div class="mt-8 flex flex-col sm:flex-row gap-3">
              <router-link to="/auctions" class="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-7 py-4 text-sm font-black text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800">
                {{ settings.brand.primary_cta }}
              </router-link>
              <router-link to="/seller/listings/create" class="inline-flex items-center justify-center rounded-2xl bg-white px-7 py-4 text-sm font-black text-slate-950 shadow-sm border border-slate-200 hover:border-blue-200 hover:text-blue-700">
                {{ settings.brand.secondary_cta }}
              </router-link>
            </div>
          </div>

          <div class="relative">
            <div class="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-blue-700/15 to-gold-500/20 blur-2xl" />
            <div class="relative rounded-[2.5rem] bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 p-6 shadow-2xl overflow-hidden min-h-[360px]">
              <div class="absolute right-6 top-6 rounded-full bg-white/20 px-4 py-2 text-white text-sm font-black backdrop-blur">516 watching</div>
              <h2 class="text-5xl sm:text-6xl font-black tracking-tight text-white">{{ settings.brand.name }}</h2>
              <div class="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-3xl font-black text-rose-500">
                <span class="w-4 h-4 rounded-full bg-rose-500" /> LIVE
              </div>
              <div class="absolute bottom-8 right-6 left-6 grid grid-cols-3 gap-4">
                <div class="rounded-[2rem] bg-white/80 p-4 shadow-xl backdrop-blur rotate-[-8deg]">
                  <div class="aspect-square rounded-full bg-gradient-to-br from-amber-200 to-amber-500 grid place-items-center text-4xl">$</div>
                </div>
                <div class="rounded-[2rem] bg-white/85 p-4 shadow-xl backdrop-blur translate-y-[-34px]">
                  <div class="aspect-square rounded-full bg-gradient-to-br from-slate-200 to-slate-500 grid place-items-center text-white font-black">LOT</div>
                </div>
                <div class="rounded-[2rem] bg-white/80 p-4 shadow-xl backdrop-blur rotate-[8deg]">
                  <div class="aspect-square rounded-full bg-gradient-to-br from-yellow-200 to-orange-500 grid place-items-center text-4xl">⌚</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div v-for="feature in featureBlocks" :key="feature.title" class="rounded-3xl bg-white/80 p-5 shadow-sm border border-white backdrop-blur">
            <p class="font-mono text-xs font-bold text-blue-700">{{ feature.stat }}</p>
            <h3 class="mt-2 font-black text-slate-950">{{ feature.title }}</h3>
            <p class="mt-1 text-sm text-slate-600">{{ feature.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="flex items-end justify-between gap-4 mb-7">
        <div>
          <p class="font-mono text-xs uppercase tracking-[0.25em] text-blue-700">Featured auctions</p>
          <h2 class="text-3xl font-black tracking-tight text-slate-950">{{ settings.homepage.featured_title }}</h2>
        </div>
        <router-link to="/auctions" class="hidden sm:inline-flex rounded-full px-5 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">View all lots</router-link>
      </div>
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <BaseSkeleton v-for="i in 4" :key="i" type="card" />
      </div>
      <div v-else-if="liveAuctions.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <AuctionCard v-for="auction in liveAuctions" :key="auction.id" :auction="auction" />
      </div>
      <div v-else class="rounded-[2rem] bg-white border border-slate-200 p-10 text-center">
        <h3 class="text-xl font-black text-slate-950">No live auctions yet</h3>
        <p class="mt-2 text-slate-600">Connect Supabase and approve listings to populate this section.</p>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
      <div class="mb-7">
        <p class="font-mono text-xs uppercase tracking-[0.25em] text-blue-700">Specialist departments</p>
        <h2 class="text-3xl font-black tracking-tight text-slate-950">{{ settings.homepage.category_title }}</h2>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <router-link
          v-for="cat in featuredCategories"
          :key="cat.slug"
          :to="`/categories/${cat.slug}`"
          :class="['relative min-h-40 overflow-hidden rounded-[2rem] bg-gradient-to-br p-5 text-white shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all', cat.tone]"
        >
          <svg class="w-8 h-8 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="cat.icon" />
          </svg>
          <h3 class="absolute bottom-5 left-5 right-5 text-lg font-black">{{ cat.name }}</h3>
          <div class="absolute -right-8 -bottom-8 h-28 w-28 rounded-full bg-white/15" />
        </router-link>
      </div>
    </section>

    <section class="bg-white py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-center">
        <div>
          <p class="font-mono text-xs uppercase tracking-[0.25em] text-blue-700">Why bidders trust us</p>
          <h2 class="mt-2 text-4xl font-black tracking-tight text-slate-950">{{ settings.homepage.trust_title }}</h2>
        </div>
        <div class="grid sm:grid-cols-3 gap-4">
          <div class="rounded-[2rem] bg-slate-50 p-6 border border-slate-200"><h3 class="font-black text-slate-950">Verified bidders</h3><p class="mt-2 text-sm text-slate-600">Identity verification, deposits, limits, and reputation scores reduce manipulation.</p></div>
          <div class="rounded-[2rem] bg-slate-50 p-6 border border-slate-200"><h3 class="font-black text-slate-950">Immutable audit trail</h3><p class="mt-2 text-sm text-slate-600">Every bid, escrow movement, dispute, and state change is logged with snapshots.</p></div>
          <div class="rounded-[2rem] bg-slate-50 p-6 border border-slate-200"><h3 class="font-black text-slate-950">Escrow resolution</h3><p class="mt-2 text-sm text-slate-600">Funds can be released, frozen, or refunded after arbitration outcomes.</p></div>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="rounded-[2.5rem] bg-slate-950 p-8 lg:p-12 text-white overflow-hidden relative">
        <div class="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-700/30 blur-3xl" />
        <div class="relative grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <p class="font-mono text-xs uppercase tracking-[0.25em] text-gold-500">For sellers</p>
            <h2 class="mt-2 text-4xl font-black tracking-tight">Turn rare inventory into competitive auctions.</h2>
            <p class="mt-4 text-slate-300">Create listings, set reserve prices, submit for approval, and let timed bidding discover the market price.</p>
          </div>
          <div class="flex lg:justify-end">
            <router-link to="/seller/listings/create" class="rounded-2xl bg-gold-500 px-7 py-4 text-sm font-black text-slate-950 hover:bg-gold-400">Submit your first lot</router-link>
          </div>
        </div>
      </div>
    </section>
  </UserLayout>
</template>
