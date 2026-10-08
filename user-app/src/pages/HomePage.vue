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
  {
    name: "Watches",
    slug: "watches",
    // Wristwatch with strap & bezel
    icon: "M12 6a6 6 0 100 12 6 6 0 000-12zm0 2a4 4 0 110 8 4 4 0 010-8zm-1 2v2.5l2 1.2.5-.8-1.5-.9V10h-1zm-2-7h6l-.75 3h-4.5L9 3zm0 18h6l-.75-3h-4.5L9 21z",
    gradient: "from-amber-400/20 via-orange-400/10 to-yellow-300/25",
    border: "border-amber-300/50 hover:border-amber-400",
    glow: "bg-amber-400/25",
    iconBg: "bg-amber-500/15 text-amber-900 border-amber-300/60",
    badge: "bg-amber-500/15 text-amber-900 border-amber-300/40",
  },
  {
    name: "Jewellery",
    slug: "jewelry",
    // Brilliant cut diamond
    icon: "M6 3h12l4 6-10 12L2 9l4-6zm.7 2L3.9 8.5h3.9L6.7 5zm2.4 0l1 3.5h3.8l1-3.5H9.1zm7.8 0l-1.1 3.5h3.9L16.9 5zM4.6 10.5L12 19.3l7.4-8.8H4.6z",
    gradient: "from-pink-400/20 via-rose-400/10 to-red-300/25",
    border: "border-pink-300/50 hover:border-pink-400",
    glow: "bg-pink-400/25",
    iconBg: "bg-pink-500/15 text-pink-900 border-pink-300/60",
    badge: "bg-pink-500/15 text-pink-900 border-pink-300/40",
  },
  {
    name: "Art",
    slug: "art",
    // Painter's palette
    icon: "M12 2C6.48 2 2 6.48 2 12c0 4.42 3.58 8 8 8 1.1 0 2-.9 2-2 0-.52-.2-1-.53-1.37-.32-.37-.47-.85-.47-1.38 0-1.1.9-2 2-2h1.67c3.95 0 6.33-3.05 6.33-6.67C21.4 5.28 17.06 2 12 2zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8s1.5.67 1.5 1.5S7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
    gradient: "from-purple-400/20 via-fuchsia-400/10 to-indigo-300/25",
    border: "border-purple-300/50 hover:border-purple-400",
    glow: "bg-purple-400/25",
    iconBg: "bg-purple-500/15 text-purple-900 border-purple-300/60",
    badge: "bg-purple-500/15 text-purple-900 border-purple-300/40",
  },
  {
    name: "Interiors",
    slug: "antiques",
    // Armchair / Lounge furniture
    icon: "M7 4a2 2 0 012-2h6a2 2 0 012 2v7h1a3 3 0 013 3v3a2 2 0 01-2 2h-1v2a1 1 0 11-2 0v-2H8v2a1 1 0 11-2 0v-2H5a2 2 0 01-2-2v-3a3 3 0 013-3h1V4zm2 0v7h6V4H9zm-2 9H6a1 1 0 00-1 1v3h2v-4zm12 0h-1v4h2v-3a1 1 0 00-1-1zm-3 0H8v4h8v-4z",
    gradient: "from-violet-400/20 via-blue-400/10 to-purple-300/25",
    border: "border-violet-300/50 hover:border-violet-400",
    glow: "bg-violet-400/25",
    iconBg: "bg-violet-500/15 text-violet-900 border-violet-300/60",
    badge: "bg-violet-500/15 text-violet-900 border-violet-300/40",
  },
  {
    name: "Collectibles",
    slug: "collectibles",
    // Rare award star / Trophy medal
    icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2zm0 3.75L9.9 9.87l-4.55.66 3.3 3.2-.78 4.53 4.13-2.17 4.13 2.17-.78-4.53 3.3-3.2-4.55-.66L12 5.75z",
    gradient: "from-emerald-400/20 via-teal-400/10 to-green-300/25",
    border: "border-emerald-300/50 hover:border-emerald-400",
    glow: "bg-emerald-400/25",
    iconBg: "bg-emerald-500/15 text-emerald-900 border-emerald-300/60",
    badge: "bg-emerald-500/15 text-emerald-900 border-emerald-300/40",
  },
  {
    name: "Cars",
    slug: "vehicles",
    // Sports car / Vehicle front
    icon: "M5 11l1.5-4.5A2.5 2.5 0 018.87 5h6.26a2.5 2.5 0 012.37 1.5L19 11h1a2 2 0 012 2v5a1 1 0 01-1 1h-1a2 2 0 01-2-2v-1H6v1a2 2 0 01-2 2H3a1 1 0 01-1-1v-5a2 2 0 012-2h1zm3.87-4a.5.5 0 00-.47.3L7.18 11h9.64l-1.22-3.7a.5.5 0 00-.47-.3H8.87zM6.5 15a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm11 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
    gradient: "from-cyan-400/20 via-sky-400/10 to-blue-300/25",
    border: "border-cyan-300/50 hover:border-cyan-400",
    glow: "bg-cyan-400/25",
    iconBg: "bg-cyan-500/15 text-cyan-900 border-cyan-300/60",
    badge: "bg-cyan-500/15 text-cyan-900 border-cyan-300/40",
  },
];

const featureBlocks = [
  {
    title: "Real-time bidding",
    body: "Watch bids move instantly through Supabase Realtime channels.",
    stat: "WebSocket live",
    tone: "bg-emerald-500",
  },
  {
    title: "Proxy bidding",
    body: "Buyers can set a hidden maximum and let the engine bid safely.",
    stat: "Max hidden",
    tone: "bg-blue-600",
  },
  {
    title: "Escrow protected",
    body: "Winning payments are held until delivery, release, refund, or dispute resolution.",
    stat: "Finance safe",
    tone: "bg-amber-500",
  },
  {
    title: "Anti-sniping timer",
    body: "Late bids automatically extend auctions to keep competition fair.",
    stat: "+5 min",
    tone: "bg-violet-500",
  },
];

const categoryTiles = computed(() =>
  featuredCategories.map((featured) => {
    const category = categories.value.find(
      (item) => item.slug === featured.slug,
    );
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
    if (import.meta.env.DEV)
      console.error("Failed to load home page data:", err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <UserLayout>
    <!-- HERO SECTION -->
    <section class="relative overflow-hidden bg-[#f4f6fb]">
      <div
        class="pointer-events-none absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_12%_16%,rgba(30,64,175,0.18),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(234,179,8,0.16),transparent_28%),radial-gradient(rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:auto,auto,24px_24px]"
      />
      <div
        class="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-blue-700/10 blur-3xl"
      />
      <div
        class="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl"
      />

      <div
        class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16"
      >
        <div class="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p
              class="font-mono text-xs uppercase tracking-[0.35em] text-slate-700 mb-5"
            >
              {{ currentDate }}
            </p>
            <div
              class="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-50/60 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-700 shadow-xs backdrop-blur-sm"
            >
              <span>✦</span>
              <span>Live curated auctions</span>
            </div>
            <h1
              class="max-w-2xl text-5xl font-extrabold leading-[0.95] tracking-tight text-neutral-950 sm:text-6xl lg:text-7xl"
            >
              {{ settings.homepage.hero_title }}
            </h1>
            <p class="mt-6 max-w-xl text-lg leading-8 text-neutral-600">
              {{ settings.homepage.hero_subtitle }}
            </p>
            <p class="mt-6 font-semibold text-blue-700">
              {{ settings.homepage.hero_promo }}
            </p>
            <div class="mt-8 flex flex-col sm:flex-row gap-3">
              <router-link
                to="/auctions"
                class="inline-flex items-center justify-center rounded-xl bg-neutral-950 px-6 py-3.5 font-semibold text-white shadow-lg shadow-neutral-950/20 transition-all hover:bg-neutral-800"
              >
                {{ settings.brand.primary_cta }}
              </router-link>
              <router-link
                to="/seller/listings/create"
                class="inline-flex items-center justify-center rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-slate-950 shadow-xs border border-slate-200 hover:border-blue-200 hover:text-blue-700 transition-colors"
              >
                {{ settings.brand.secondary_cta }}
              </router-link>
            </div>
          </div>

          <!-- HERO SHOWCASE CARD -->
          <div class="relative">
            <div
              class="absolute -inset-4 rounded-3xl bg-blue-700/10 blur-2xl"
            />
            <div
              class="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-3.5 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:shadow-blue-500/10"
            >
              <div
                class="relative aspect-[16/10] overflow-hidden rounded-2xl bg-neutral-100"
              >
                <img
                  v-if="heroImageUrl"
                  :src="heroImageUrl"
                  :alt="
                    heroAuction?.listings?.title || 'Featured live auction lot'
                  "
                  class="h-full w-full object-cover"
                />
                <div
                  v-else
                  class="grid h-full w-full place-items-center bg-gradient-to-br from-slate-200 via-neutral-100 to-slate-300"
                >
                  <span
                    class="font-mono text-sm font-bold uppercase tracking-[0.3em] text-neutral-500"
                    >Featured lot</span
                  >
                </div>
                <div
                  class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"
                />

                <!-- Top Overlays -->
                <div
                  class="absolute left-3.5 right-3.5 top-3.5 flex items-center justify-between gap-3 pointer-events-none"
                >
                  <!-- Status Pill (Left) -->
                  <span
                    v-if="heroAuction?.status !== 'closed'"
                    class="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-300 shadow-md backdrop-blur-md"
                  >
                    <span
                      class="h-2 w-2 animate-pulse rounded-full bg-emerald-400"
                    />
                    LIVE
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-neutral-900/60 px-3 py-1 text-xs font-medium text-neutral-200 shadow-md backdrop-blur-md"
                  >
                    <span class="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                    ENDED
                  </span>

                  <!-- Timer / Closed Tag (Right) -->
                  <div
                    v-if="heroAuction?.status !== 'closed'"
                    class="flex items-center gap-1.5 rounded-full border border-white/15 bg-neutral-950/60 px-3 py-1 font-mono text-xs font-semibold tabular-nums text-white shadow-md backdrop-blur-md [&_*]:!bg-transparent [&_*]:!text-white [&_*]:!border-none [&_*]:!p-0 [&_*]:!m-0 [&_*]:!shadow-none"
                  >
                    <svg
                      class="h-3.5 w-3.5 text-neutral-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <CountdownTimer
                      v-if="heroAuction"
                      :end-time="heroAuction.end_time"
                      :status="heroAuction.status"
                      size="sm"
                      :show-badge="false"
                    />
                    <span v-else>02h : 15m : 42s</span>
                  </div>
                  <div
                    v-else
                    class="rounded-full border border-white/15 bg-neutral-950/60 px-3 py-1 font-mono text-xs font-medium text-neutral-300 shadow-md backdrop-blur-md"
                  >
                    Closed
                  </div>
                </div>
              </div>

              <!-- Card Body -->
              <div
                class="rounded-b-2xl border-x border-b border-neutral-200/80 bg-white p-5"
              >
                <h2 class="line-clamp-1 text-lg font-bold text-neutral-950">
                  {{
                    heroAuction?.listings?.title ||
                    "1968 Rolex Submariner Ref. 5513"
                  }}
                </h2>
                <div class="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p
                      class="text-xs font-semibold uppercase tracking-wider text-neutral-500"
                    >
                      Current bid
                    </p>
                    <p
                      class="mt-0.5 font-mono text-xl font-bold tabular-nums text-neutral-900"
                    >
                      ${{
                        Number(heroAuction?.current_price || 0).toLocaleString()
                      }}
                    </p>
                    <p class="mt-1 text-xs text-neutral-500">
                      {{ heroAuction?.bids?.[0]?.count || 18 }} bids placed
                    </p>
                  </div>
                  <router-link
                    to="/auctions"
                    :class="[
                      'inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-xs font-bold transition-all shadow-md',
                      heroAuction?.status === 'closed'
                        ? 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border border-neutral-200'
                        : 'bg-neutral-950 text-white hover:bg-neutral-800',
                    ]"
                  >
                    {{
                      heroAuction?.status === "closed"
                        ? "View Results"
                        : "Place Bid"
                    }}
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- HERO TRUST BADGES -->
        <div class="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div
            v-for="feature in featureBlocks"
            :key="feature.title"
            class="relative flex min-h-[105px] flex-col justify-start rounded-2xl border border-neutral-200/80 bg-white/70 p-4 shadow-xs backdrop-blur-md transition-all hover:border-neutral-300 hover:shadow-md"
          >
            <span :class="['mb-3 h-1 w-10 rounded-full', feature.tone]" />
            <p
              class="text-xs font-bold uppercase tracking-wider text-neutral-900"
            >
              {{ feature.title }}
            </p>
            <p class="mt-1.5 text-xs leading-relaxed text-neutral-600">
              {{ feature.body }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ENDING SOON AUCTION GRID -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="mb-7 flex items-end justify-between gap-4">
        <div>
          <p
            class="font-mono text-xs uppercase tracking-[0.25em] text-blue-700"
          >
            Featured auctions
          </p>
          <h2 class="text-3xl font-black tracking-tight text-slate-950">
            {{ settings.homepage.featured_title }}
          </h2>
        </div>
        <router-link
          to="/auctions"
          class="group hidden items-center gap-1 rounded-full px-5 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 sm:inline-flex"
        >
          View all live lots
          <span class="transition-transform group-hover:translate-x-1">→</span>
        </router-link>
      </div>
      <div
        v-if="loading"
        class="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        <BaseSkeleton v-for="i in 4" :key="i" type="card" />
      </div>
      <div
        v-else-if="liveAuctions.length"
        class="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        <AuctionCard
          v-for="auction in liveAuctions"
          :key="auction.id"
          :auction="auction"
        />
      </div>
      <div
        v-else
        class="rounded-[2rem] bg-white border border-slate-200 p-10 text-center"
      >
        <h3 class="text-xl font-black text-slate-950">No live auctions yet</h3>
        <p class="mt-2 text-slate-600">
          Connect Supabase and approve listings to populate this section.
        </p>
      </div>
    </section>

    <!-- SPECIALIST DEPARTMENTS (COLORFUL GLASSMORPHISM) -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
      <div class="mb-7">
        <p class="font-mono text-xs uppercase tracking-[0.25em] text-blue-700">
          Specialist departments
        </p>
        <h2 class="text-3xl font-black tracking-tight text-slate-950">
          {{ settings.homepage.category_title }}
        </h2>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <router-link
          v-for="cat in categoryTiles"
          :key="cat.slug"
          :to="`/categories/${cat.slug}`"
          :class="[
            'group relative overflow-hidden rounded-3xl p-5 min-h-[150px] flex flex-col justify-between border backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl cursor-pointer',
            'bg-gradient-to-br',
            cat.gradient,
            cat.border,
          ]"
        >
          <!-- Ambient Glow Orb inside glass -->
          <div
            :class="[
              'pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-150',
              cat.glow,
            ]"
          />

          <!-- Top Row: Translucent Glass Icon + Arrow -->
          <div class="relative z-10 flex items-center justify-between">
            <div
              :class="[
                'w-11 h-11 rounded-2xl flex items-center justify-center border backdrop-blur-md shadow-xs transition-transform duration-300 group-hover:scale-110',
                cat.iconBg,
              ]"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  :d="cat.icon"
                />
              </svg>
            </div>
            <span
              class="text-neutral-500 group-hover:text-neutral-900 group-hover:translate-x-1 transition-all duration-200 text-sm font-semibold"
            >
              →
            </span>
          </div>

          <!-- Bottom Row: Title + Frosted Badge -->
          <div class="relative z-10 mt-4">
            <h3
              class="font-extrabold text-base text-neutral-950 tracking-tight leading-snug"
            >
              {{ cat.name }}
            </h3>
            <span
              :class="[
                'inline-flex items-center text-xs font-bold border backdrop-blur-md px-2.5 py-0.5 rounded-full mt-2 shadow-2xs',
                cat.badge,
              ]"
            >
              {{ cat.lotCount }} lots
            </span>
          </div>
        </router-link>
      </div>
    </section>

    <!-- TRUST SECTION -->
    <section class="bg-white py-16 border-t border-neutral-100">
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-center"
      >
        <div>
          <p
            class="font-mono text-xs uppercase tracking-[0.25em] text-blue-700"
          >
            Why bidders trust us
          </p>
          <h2 class="mt-2 text-4xl font-black tracking-tight text-slate-950">
            {{ settings.homepage.trust_title }}
          </h2>
        </div>
        <div class="grid sm:grid-cols-3 gap-4">
          <div
            class="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs"
          >
            <div
              class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold"
            >
              ✓
            </div>
            <h3 class="font-bold text-neutral-900">Verified bidders</h3>
            <p class="mt-2 text-sm text-neutral-600 leading-relaxed">
              Identity verification, deposits, limits, and reputation scores
              reduce manipulation.
            </p>
          </div>
          <div
            class="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs"
          >
            <div
              class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold"
            >
              ✓
            </div>
            <h3 class="font-bold text-neutral-900">Immutable audit trail</h3>
            <p class="mt-2 text-sm text-neutral-600 leading-relaxed">
              Every bid, escrow movement, dispute, and state change is logged
              with snapshots.
            </p>
          </div>
          <div
            class="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs"
          >
            <div
              class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold"
            >
              ✓
            </div>
            <h3 class="font-bold text-neutral-900">Escrow resolution</h3>
            <p class="mt-2 text-sm text-neutral-600 leading-relaxed">
              Funds can be released, frozen, or refunded after arbitration
              outcomes.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- BOTTOM SELLER CTA -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div
        class="relative rounded-3xl border border-neutral-800 bg-gradient-to-r from-neutral-950 via-slate-900 to-neutral-950 p-8 text-white shadow-2xl ring-1 ring-white/5 md:p-12"
      >
        <div
          class="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-700/30 blur-3xl pointer-events-none"
        />
        <div
          class="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <p
              class="font-mono text-xs uppercase tracking-[0.25em] text-amber-400"
            >
              For sellers
            </p>
            <h2 class="mt-2 text-2xl font-bold text-white lg:text-4xl">
              Turn rare inventory into competitive auctions.
            </h2>
            <p class="mt-4 text-sm leading-6 text-neutral-300">
              Create listings, set reserve prices, submit for approval, and let
              timed bidding discover the market price.
            </p>
          </div>
          <div class="flex items-center lg:justify-end lg:pr-4">
            <router-link
              to="/seller/listings/create"
              class="inline-flex items-center justify-center rounded-xl bg-amber-400 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-400/20 transition-all hover:bg-amber-300"
            >
              Submit your first lot
            </router-link>
          </div>
        </div>
      </div>
    </section>
  </UserLayout>
</template>
