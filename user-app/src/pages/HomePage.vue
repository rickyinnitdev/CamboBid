<script setup>
import { ref, computed, onMounted } from "vue";
import UserLayout from "@/components/layout/UserLayout.vue";
import AuctionCard from "@/components/auction/AuctionCard.vue";
import CountdownTimer from "@/components/auction/CountdownTimer.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import { auctionService } from "@/services/auctionService";
import { listingService } from "@/services/listingService";
import { searchService } from "@/services/searchService";
import { platformSettingsService } from "@/services/platformSettingsService";

const settings = ref(platformSettingsService.getCached());
const liveAuctions = ref([]);
const featuredListings = ref([]);
const categories = ref([]);
const loading = ref(true);
const currentDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

const featuredCategories = [
  { name: "Watches", slug: "watches", icon: "M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { name: "Jewellery", slug: "jewelry", icon: "M12 3l7 8-7 10-7-10 7-8z" },
  { name: "Art", slug: "art", icon: "M4 16l4-4 4 4 8-8" },
  { name: "Interiors", slug: "antiques", icon: "M4 6h16M4 10h16M6 14h12M8 18h8" },
  { name: "Collectibles", slug: "collectibles", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" },
  { name: "Cars", slug: "vehicles", icon: "M3 13l2-5a2 2 0 011.9-1.37h10.2A2 2 0 0119 8l2 5M5 13h14v6H5v-6z" },
];

const featureBlocks = [
  { title: "Real-time bidding", body: "Watch bids move instantly through Supabase Realtime channels.", stat: "WebSocket live", tone: "bg-emerald-500" },
  { title: "Proxy bidding", body: "Buyers can set a hidden maximum and let the engine bid safely.", stat: "Max hidden", tone: "bg-blue-600" },
  { title: "Escrow protected", body: "Winning payments are held until delivery, release, refund, or dispute resolution.", stat: "Finance safe", tone: "bg-amber-500" },
  { title: "Anti-sniping timer", body: "Late bids automatically extend auctions to keep competition fair.", stat: "+5 min", tone: "bg-violet-500" },
];

const categoryTiles = computed(() =>
  featuredCategories.map((featured) => {
    const category = categories.value.find((item) => item.slug === featured.slug);
    return {
      ...featured,
      imageUrl: category?.image_url,
      lotCount: category?.listings?.[0]?.count || 0,
    };
  }),
);

const heroAuction = computed(() => liveAuctions.value[0] || null);
const heroImageUrl = computed(() => {
  const images = heroAuction.value?.listings?.images;
  if (!Array.isArray(images) || !images.length) return null;
  return typeof images[0] === "string" ? images[0] : images[0]?.url || null;
});

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
    <!-- HERO SECTION -->
    <section class="relative overflow-hidden bg-[#f4f6fb]">
      <div class="pointer-events-none absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_12%_16%,rgba(30,64,175,0.18),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(234,179,8,0.16),transparent_28%),radial-gradient(rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:auto,auto,24px_24px]" />
      <div class="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-blue-700/10 blur-3xl" />
      <div class="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />
      
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div class="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p class="font-mono text-xs uppercase tracking-[0.35em] text-slate-700 mb-5">{{ currentDate }}</p>
            <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-50/60 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-700 shadow-xs backdrop-blur-sm">
              <span>✦</span>
              <span>Live curated auctions</span>
            </div>
            <h1 class="max-w-2xl text-5xl font-extrabold leading-[0.95] tracking-tight text-neutral-950 sm:text-6xl lg:text-7xl">
              {{ settings.homepage.hero_title }}
            </h1>
            <p class="mt-6 max-w-xl text-lg leading-8 text-neutral-600">
              {{ settings.homepage.hero_subtitle }}
            </p>
            <p class="mt-6 font-semibold text-blue-700">{{ settings.homepage.hero_promo }}</p>
            <div class="mt-8 flex flex-col sm:flex-row gap-3">
              <router-link to="/auctions" class="inline-flex items-center justify-center rounded-xl bg-neutral-950 px-6 py-3.5 font-semibold text-white shadow-lg shadow-neutral-950/20 transition-all hover:bg-neutral-800">
                {{ settings.brand.primary_cta }}
              </router-link>
              <router-link to="/seller/listings/create" class="inline-flex items-center justify-center rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-slate-950 shadow-xs border border-slate-200 hover:border-blue-200 hover:text-blue-700 transition-colors">
                {{ settings.brand.secondary_cta }}
              </router-link>
            </div>
          </div>

          <!-- HERO SHOWCASE CARD -->
          <div class="relative">
            <div class="absolute -inset-4 rounded-3xl bg-blue-700/10 blur-2xl" />
            <div class="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-3.5 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:shadow-blue-500/10">
              <div class="relative aspect-[16/10] overflow-hidden rounded-2xl bg-neutral-100">
                <img
                  v-if="heroImageUrl"
                  :src="heroImageUrl"
                  :alt="heroAuction?.listings?.title || 'Featured live auction lot'"
                  class="h-full w-full object-cover"
                />
                <div v-else class="grid h-full w-full place-items-center bg-gradient-to-br from-slate-200 via-neutral-100 to-slate-300">
                  <span class="font-mono text-sm font-bold uppercase tracking-[0.3em] text-neutral-500">Featured lot</span>
                </div>
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                <div class="absolute left-3.5 right-3.5 top-3.5 flex items-start justify-between gap-3">
                  <span v-if="heroAuction?.status !== 'closed'" class="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 shadow-xs backdrop-blur-md">
                    <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    LIVE
                  </span>
                  <span v-else class="inline-flex items-center whitespace-nowrap rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs font-medium text-neutral-200 shadow-xs backdrop-blur-md">
                    ENDED
                  </span>
                  <span class="rounded-full border border-white/10 bg-black/60 px-3 py-1 font-mono text-xs font-semibold tabular-nums text-white backdrop-blur-md">
                    <CountdownTimer
                      v-if="heroAuction"
                      :end-time="heroAuction.end_time"
                      :status="heroAuction.status"
                      size="sm"
                      :show-badge="false"
                    />
                    <span v-else>02h : 15m : 42s</span>
                  </span>
                </div>
              </div>
              <div class="rounded-b-2xl border-x border-b border-neutral-200/80 bg-white p-5">
                <h2 class="line-clamp-1 text-lg font-bold text-neutral-950">
                  {{ heroAuction?.listings?.title || "1968 Rolex Submariner Ref. 5513" }}
                </h2>
                <div class="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Current bid</p>
                    <p class="mt-0.5 font-mono text-xl font-bold tabular-nums text-neutral-900">
                      ${{ Number(heroAuction?.current_price || 0).toLocaleString() }}
                    </p>
                    <p class="mt-1 text-xs text-neutral-500">{{ heroAuction?.bids?.[0]?.count || 18 }} bids placed</p>
                  </div>
                  <router-link to="/auctions" class="inline-flex items-center justify-center rounded-xl bg-neutral-950 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-neutral-800">
                    Place Bid
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- HERO TRUST BADGES -->
        <div class="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div v-for="feature in featureBlocks" :key="feature.title" class="relative flex min-h-[105px] flex-col justify-start rounded-2xl border border-neutral-200/80 bg-white/70 p-4 shadow-xs backdrop-blur-md transition-all hover:border-neutral-300 hover:shadow-md">
            <span :class="['mb-3 h-1 w-10 rounded-full', feature.tone]" />
            <p class="text-xs font-bold uppercase tracking-wider text-neutral-900">{{ feature.title }}</p>
            <p class="mt-1.5 text-xs leading-relaxed text-neutral-600">{{ feature.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ENDING SOON AUCTION GRID -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="mb-7 flex items-end justify-between gap-4">
        <div>
          <p class="font-mono text-xs uppercase tracking-[0.25em] text-blue-700">Featured auctions</p>
          <h2 class="text-3xl font-black tracking-tight text-slate-950">{{ settings.homepage.featured_title }}</h2>
        </div>
        <router-link to="/auctions" class="group hidden items-center gap-1 rounded-full px-5 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 sm:inline-flex">
          View all live lots <span class="transition-transform group-hover:translate-x-1">→</span>
        </router-link>
      </div>
      <div v-if="loading" class="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <BaseSkeleton v-for="i in 4" :key="i" type="card" />
      </div>
      <div v-else-if="liveAuctions.length" class="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <AuctionCard v-for="auction in liveAuctions" :key="auction.id" :auction="auction" />
      </div>
      <div v-else class="rounded-[2rem] bg-white border border-slate-200 p-10 text-center">
        <h3 class="text-xl font-black text-slate-950">No live auctions yet</h3>
        <p class="mt-2 text-slate-600">Connect Supabase and approve listings to populate this section.</p>
      </div>
    </section>

    <!-- SPECIALIST DEPARTMENTS (CLEAN HIGH-CONTRAST LIGHT CARDS) -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
      <div class="mb-7">
        <p class="font-mono text-xs uppercase tracking-[0.25em] text-blue-700">Specialist departments</p>
        <h2 class="text-3xl font-black tracking-tight text-slate-950">{{ settings.homepage.category_title }}</h2>
      </div>
      
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <router-link
          v-for="cat in categoryTiles"
          :key="cat.slug"
          :to="`/categories/${cat.slug}`"
          class="group relative bg-white border border-neutral-200/90 rounded-2xl p-5 min-h-[140px] flex flex-col justify-between shadow-xs hover:shadow-lg hover:border-neutral-400 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
        >
          <!-- Top Row: Icon + Hover Arrow -->
          <div class="flex items-center justify-between">
            <div class="w-11 h-11 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center group-hover:bg-neutral-900 group-hover:text-white transition-colors duration-200">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" :d="cat.icon" />
              </svg>
            </div>
            <span class="text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-1 transition-all duration-200 text-sm font-semibold">
              →
            </span>
          </div>

          <!-- Bottom Row: Title + Lot Count Pill -->
          <div class="mt-4">
            <h3 class="font-bold text-base text-neutral-900 tracking-tight leading-snug">
              {{ cat.name }}
            </h3>
            <span class="inline-flex items-center text-xs font-medium text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full mt-2">
              {{ cat.lotCount }} lots
            </span>
          </div>
        </router-link>
      </div>
    </section>

    <!-- TRUST SECTION -->
    <section class="bg-white py-16 border-t border-neutral-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-center">
        <div>
          <p class="font-mono text-xs uppercase tracking-[0.25em] text-blue-700">Why bidders trust us</p>
          <h2 class="mt-2 text-4xl font-black tracking-tight text-slate-950">{{ settings.homepage.trust_title }}</h2>
        </div>
        <div class="grid sm:grid-cols-3 gap-4">
          <div class="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
            <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold">✓</div>
            <h3 class="font-bold text-neutral-900">Verified bidders</h3>
            <p class="mt-2 text-sm text-neutral-600 leading-relaxed">Identity verification, deposits, limits, and reputation scores reduce manipulation.</p>
          </div>
          <div class="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
            <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold">✓</div>
            <h3 class="font-bold text-neutral-900">Immutable audit trail</h3>
            <p class="mt-2 text-sm text-neutral-600 leading-relaxed">Every bid, escrow movement, dispute, and state change is logged with snapshots.</p>
          </div>
          <div class="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
            <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold">✓</div>
            <h3 class="font-bold text-neutral-900">Escrow resolution</h3>
            <p class="mt-2 text-sm text-neutral-600 leading-relaxed">Funds can be released, frozen, or refunded after arbitration outcomes.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- BOTTOM SELLER CTA -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="relative rounded-3xl border border-neutral-800 bg-gradient-to-r from-neutral-950 via-slate-900 to-neutral-950 p-8 text-white shadow-2xl ring-1 ring-white/5 md:p-12">
        <div class="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-700/30 blur-3xl pointer-events-none" />
        <div class="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="font-mono text-xs uppercase tracking-[0.25em] text-amber-400">For sellers</p>
            <h2 class="mt-2 text-2xl font-bold text-white lg:text-4xl">Turn rare inventory into competitive auctions.</h2>
            <p class="mt-4 text-sm leading-6 text-neutral-300">Create listings, set reserve prices, submit for approval, and let timed bidding discover the market price.</p>
          </div>
          <div class="flex items-center lg:justify-end lg:pr-4">
            <router-link to="/seller/listings/create" class="inline-flex items-center justify-center rounded-xl bg-amber-400 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-400/20 transition-all hover:bg-amber-300">
              Submit your first lot
            </router-link>
          </div>
        </div>
      </div>
    </section>
  </UserLayout>
</template>