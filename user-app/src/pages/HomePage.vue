<script setup>
import { computed, onMounted, ref } from "vue";
import {
  ArrowRightIcon,
  BoltIcon,
  BookOpenIcon,
  CameraIcon,
  ClockIcon,
  CubeIcon,
  HomeModernIcon,
  IdentificationIcon,
  PaintBrushIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TruckIcon,
} from "@heroicons/vue/24/outline";
import UserLayout from "@/components/layout/UserLayout.vue";
import AuctionCard from "@/components/auction/AuctionCard.vue";
import AuctionStatusBadge from "@/components/auction/AuctionStatusBadge.vue";
import CountdownTimer from "@/components/auction/CountdownTimer.vue";
import PriceDisplay from "@/components/auction/PriceDisplay.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import PkarPattern from "@/components/base/PkarPattern.vue";
import KhmerArchitecture from "@/components/base/KhmerArchitecture.vue";
import KhmerDivider from "@/components/base/KhmerDivider.vue";
import { marketplace } from "@/data/marketplace";
import { platformSettingsService } from "@/services/platformSettingsService";
import {
  getAuctionState,
  getBidCount,
  getListing,
  getPrimaryImage,
  getSellerName,
} from "@/utils/auctionPresentation";

const settings = ref(platformSettingsService.getCached());
const HERO_MOTTO = "Bid. Win. Belong.";
const LEGACY_HERO_TITLE = "Objects worth keeping. Bids worth watching.";
const live = ref([]);
const endingSoon = ref([]);
const upcoming = ref([]);
const categories = ref([]);
const loading = ref(true);

const categoryIcons = {
  watches: ClockIcon,
  jewelry: SparklesIcon,
  art: PaintBrushIcon,
  collectibles: CameraIcon,
  antiques: HomeModernIcon,
  books: BookOpenIcon,
  vehicles: TruckIcon,
  handicrafts: CubeIcon,
};

const heroTitle = computed(() => {
  const title = settings.value.homepage?.hero_title;
  return !title || title === LEGACY_HERO_TITLE ? HERO_MOTTO : title;
});

const featured = computed(
  () =>
    live.value.find((auction) => getAuctionState(auction).key === "live") ||
    live.value[0] ||
    null,
);
const featuredListing = computed(() => getListing(featured.value));
const featuredState = computed(() => getAuctionState(featured.value));
const featuredImage = computed(() => getPrimaryImage(featuredListing.value));

const liveGrid = computed(() =>
  live.value
    .filter((auction) => auction.id !== featured.value?.id)
    .slice(0, 4),
);

const closing = computed(() =>
  endingSoon.value
    .filter((auction) => auction.id !== featured.value?.id)
    .slice(0, 4),
);

const upcomingList = computed(() => upcoming.value.slice(0, 3));

const liveCount = computed(
  () => live.value.filter((a) => getAuctionState(a).canBid).length,
);

const steps = [
  {
    title: "Find the lot",
    body: "Browse by category or by what is closing soon. Condition, provenance notes and the current bid are shown before you commit.",
  },
  {
    title: "Place your bid",
    body: "Enter a bid or set a hidden maximum with proxy bidding. The next minimum is always shown before you confirm.",
  },
  {
    title: "Pay and receive",
    body: "If you win, pay from your wallet. Payment is held until you confirm the item has arrived as described.",
  },
];

const protections = [
  {
    icon: BoltIcon,
    title: "Live bid updates",
    body: "New bids and the current price appear on the lot page as they happen.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Payment held",
    body: "Winning payments stay held until you confirm delivery.",
  },
  {
    icon: IdentificationIcon,
    title: "Verified bidders",
    body: "Identity checks are available for bidders who want a verified account.",
  },
  {
    icon: ScaleIcon,
    title: "Dispute centre",
    body: "Open a case if an item arrives damaged or not as described.",
  },
];

onMounted(async () => {
  platformSettingsService
    .getAll()
    .then((data) => {
      settings.value = data;
    })
    .catch(() => {});

  try {
    const [liveData, endingData, upcomingData, categoryData] =
      await Promise.all([
        marketplace.getLiveAuctions(),
        marketplace.getEndingSoon(5),
        marketplace.getUpcomingAuctions(),
        marketplace.getCategories(),
      ]);
    live.value = liveData;
    endingSoon.value = endingData;
    upcoming.value = upcomingData;
    categories.value = categoryData;
  } catch (error) {
    if (import.meta.env.DEV)
      console.error("Failed to load home page data:", error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <UserLayout>
    <!-- Hero ------------------------------------------------------------- -->
    <section class="relative overflow-hidden border-b border-border bg-paper">
      <PkarPattern
        class="left-auto right-0 top-auto bottom-0 h-[45%] w-full sm:top-0 sm:h-auto sm:w-[52%]"
        variant="floral"
        :opacity="0.08"
        :scale="116"
      />
      <div class="container-page relative">
        <div
          class="grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16 lg:py-20"
        >
          <div class="animate-in">
            <p class="kicker">
              Live now
              <span class="font-normal text-muted"
                >· {{ liveCount }} lots open for bidding</span
              >
            </p>
            <h1 class="display-1 mt-5 max-w-[15ch] text-balance">
              {{ heroTitle }}
            </h1>
            <p class="mt-5 max-w-xl text-[15px] leading-7 text-body sm:text-base">
              {{ settings.homepage.hero_subtitle }}
            </p>

            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <router-link
                to="/auctions"
                class="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2"
              >
                {{ settings.brand.primary_cta }}
                <ArrowRightIcon class="h-4 w-4" aria-hidden="true" />
              </router-link>
              <a
                href="#how-it-works"
                class="inline-flex items-center justify-center rounded-lg border border-line bg-white px-6 py-3 text-sm font-semibold text-heading transition-colors hover:border-navy-300 hover:bg-surface"
              >
                How bidding works
              </a>
            </div>

            <dl class="mt-10 flex flex-wrap gap-x-8 gap-y-4">
              <div>
                <dt class="meta-label">Open lots</dt>
                <dd class="numeric mt-1 text-lg font-semibold text-heading">
                  {{ liveCount }}
                </dd>
              </div>
              <div>
                <dt class="meta-label">Categories</dt>
                <dd class="numeric mt-1 text-lg font-semibold text-heading">
                  {{ categories.length }}
                </dd>
              </div>
              <div>
                <dt class="meta-label">Currency</dt>
                <dd class="mt-1 text-lg font-semibold text-heading">USD</dd>
              </div>
            </dl>
          </div>

          <div class="animate-in [animation-delay:120ms]">
            <router-link
              v-if="featured"
              :to="`/auctions/${featured.id}`"
              class="group block overflow-hidden rounded-2xl border border-border bg-white shadow-lg transition-transform duration-300 hover:-translate-y-0.5"
            >
              <span
                class="block h-1 bg-gradient-to-r from-gold-600 via-gold-400 to-gold-200"
                aria-hidden="true"
              />
              <div class="relative aspect-[5/4] overflow-hidden bg-slate-100">
                <img
                  v-if="featuredImage"
                  :src="featuredImage"
                  :alt="featuredListing.title"
                  class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div
                  class="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy-900/95 via-navy-900/55 to-transparent"
                />
                <div class="absolute left-3 top-3">
                  <AuctionStatusBadge :state="featuredState" />
                </div>
                <div class="absolute inset-x-4 bottom-4 text-white">
                  <p class="text-xs font-medium text-gold-200">
                    {{ featuredListing.categories?.name || "Featured lot" }}
                  </p>
                  <h2
                    class="mt-1 line-clamp-2 font-display text-xl font-semibold leading-snug text-white sm:text-[1.4rem]"
                  >
                    {{ featuredListing.title }}
                  </h2>
                </div>
              </div>
              <div class="p-5">
                <div class="flex items-end justify-between gap-4">
                  <PriceDisplay
                    :amount="featured.current_price"
                    :label="featuredState.priceLabel"
                    size="lg"
                  />
                  <div class="text-right">
                    <p class="meta-label">
                      {{ featuredState.isEnded ? "Closed" : "Ends in" }}
                    </p>
                    <CountdownTimer
                      v-if="!featuredState.isEnded"
                      :end-time="featured.end_time"
                      :status="featured.status"
                      size="sm"
                      class="mt-1"
                    />
                    <p v-else class="mt-1 text-sm font-medium text-body">
                      Results available
                    </p>
                  </div>
                </div>
                <div
                  class="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4"
                >
                  <span class="min-w-0 truncate text-xs text-muted">
                    {{ getBidCount(featured) }} bids ·
                    {{ getSellerName(featured) }}
                  </span>
                  <span
                    class="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-navy-800"
                  >
                    View lot
                    <ArrowRightIcon
                      class="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </div>
            </router-link>

            <div
              v-else
              class="rounded-2xl border border-border bg-white p-8 shadow-sm"
            >
              <p class="kicker">Auction house</p>
              <h2 class="mt-4 font-display text-2xl font-semibold text-heading">
                No live lots at this moment
              </h2>
              <p class="mt-2 text-sm leading-6 text-body">
                New auctions are published regularly. Browse upcoming lots or
                check the calendar for the next opening.
              </p>
              <router-link
                to="/auctions?status=scheduled"
                class="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900"
              >
                See upcoming lots
                <ArrowRightIcon class="h-4 w-4" aria-hidden="true" />
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Live auctions ---------------------------------------------------- -->
    <section class="section section-ivory relative overflow-hidden">
      <KhmerArchitecture :opacity="0.19" />
      <div class="container-page relative">
        <KhmerDivider class="mb-10" />
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="kicker">Open for bidding</p>
            <h2 class="section-heading mt-3">Live auctions</h2>
            <p class="section-lede">
              Every lot shows its current bid, bid count and remaining time.
            </p>
          </div>
          <router-link
            to="/auctions"
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900"
          >
            All auctions
            <ArrowRightIcon class="h-4 w-4" aria-hidden="true" />
          </router-link>
        </div>

        <div
          v-if="loading"
          class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <BaseSkeleton v-for="i in 4" :key="i" type="card" />
        </div>
        <div
          v-else-if="liveGrid.length"
          class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <AuctionCard
            v-for="auction in liveGrid"
            :key="auction.id"
            :auction="auction"
          />
        </div>
        <div
          v-else-if="!live.length"
          class="mt-8 rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center"
        >
          <p class="font-display text-lg font-semibold text-heading">
            No live auctions right now
          </p>
          <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-body">
            Live lots appear here as soon as sellers publish them. You can
            browse upcoming auctions in the meantime.
          </p>
          <router-link
            to="/auctions?status=scheduled"
            class="mt-5 inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-heading hover:border-navy-300"
          >
            View upcoming auctions
          </router-link>
        </div>
      </div>
    </section>

    <!-- Closing soon ----------------------------------------------------- -->
    <section v-if="closing.length" class="border-y border-border bg-white py-14 sm:py-16">
      <div class="container-page grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        <div class="lg:sticky lg:top-24 lg:self-start">
          <p class="kicker">Last hour</p>
          <h2 class="section-heading mt-3">Closing soon</h2>
          <p class="section-lede">
            These lots close within the hour. A bid in the final minutes may
            extend the auction, so the timer on each lot is the one that
            counts.
          </p>
          <router-link
            to="/auctions?status=ending_soon"
            class="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900"
          >
            See all closing lots
            <ArrowRightIcon class="h-4 w-4" aria-hidden="true" />
          </router-link>
        </div>

        <ul class="divide-y divide-border border-y border-border">
          <li v-for="auction in closing" :key="auction.id">
            <router-link
              :to="`/auctions/${auction.id}`"
              class="group flex items-center gap-4 py-4 transition-colors hover:bg-surface/70 sm:gap-5"
            >
              <div
                class="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-24 sm:w-24"
              >
                <img
                  v-if="getPrimaryImage(getListing(auction))"
                  :src="getPrimaryImage(getListing(auction))"
                  :alt="getListing(auction).title"
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-medium text-muted">
                  {{ getListing(auction).categories?.name || "Curated lot" }}
                </p>
                <h3
                  class="mt-1 line-clamp-2 font-display text-base font-semibold leading-snug text-heading group-hover:text-navy-800"
                >
                  {{ getListing(auction).title }}
                </h3>
                <p class="mt-1.5 text-xs text-muted">
                  {{ getBidCount(auction) }} bids
                </p>
              </div>
              <div class="shrink-0 text-right">
                <PriceDisplay
                  :amount="auction.current_price"
                  :label="getAuctionState(auction).priceLabel"
                  size="sm"
                />
                <CountdownTimer
                  :end-time="auction.end_time"
                  :status="auction.status"
                  size="sm"
                  class="mt-1.5"
                />
              </div>
            </router-link>
          </li>
        </ul>
      </div>
    </section>

    <!-- Upcoming --------------------------------------------------------- -->
    <section
      v-if="upcomingList.length"
      class="section relative overflow-hidden"
    >
      <KhmerArchitecture variant="wave" :opacity="0.14" />
      <div class="container-page relative">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="kicker">On the calendar</p>
            <h2 class="section-heading mt-3">Upcoming auctions</h2>
            <p class="section-lede">
              Preview the lots before bidding opens. Bidding is not available
              until the start time shown on each lot.
            </p>
          </div>
          <router-link
            to="/auctions/calendar"
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900"
          >
            Auction calendar
            <ArrowRightIcon class="h-4 w-4" aria-hidden="true" />
          </router-link>
        </div>
        <div class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AuctionCard
            v-for="auction in upcomingList"
            :key="auction.id"
            :auction="auction"
          />
        </div>
      </div>
    </section>

    <!-- Categories ------------------------------------------------------- -->
    <section
      class="section-tight relative overflow-hidden border-t border-border bg-white"
    >
      <KhmerArchitecture variant="right" :opacity="0.11" />
      <div class="container-page relative">
        <KhmerDivider class="mb-10" />
        <div class="max-w-2xl">
          <p class="kicker">Specialist departments</p>
          <h2 class="section-heading mt-3">
            {{ settings.homepage.category_title }}
          </h2>
          <p class="section-lede">
            Start with a category, then filter by status or closing time.
          </p>
        </div>

        <div class="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <router-link
            v-for="category in categories"
            :key="category.slug"
            :to="`/categories/${category.slug}`"
            class="group flex items-center gap-4 rounded-xl border border-border bg-white px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-sm"
          >
            <span
              class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy-700 transition-colors group-hover:bg-navy-900 group-hover:text-white"
            >
              <component
                :is="categoryIcons[category.slug] || CubeIcon"
                class="h-5 w-5"
                aria-hidden="true"
              />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold text-heading">{{
                category.name
              }}</span>
              <span class="mt-0.5 block text-xs text-muted">
                {{ category.listings?.[0]?.count ?? 0 }} active lots
              </span>
            </span>
            <ArrowRightIcon
              class="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-navy-600"
              aria-hidden="true"
            />
          </router-link>
        </div>
      </div>
    </section>

    <!-- How it works ----------------------------------------------------- -->
    <section id="how-it-works" class="section scroll-mt-24">
      <div class="container-page">
        <KhmerDivider class="mb-10" />
        <div class="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p class="kicker">The process</p>
            <h2 class="section-heading mt-3">How bidding works</h2>
            <p class="section-lede">
              Three steps from finding a lot to receiving it. The minimum bid
              and the time remaining are always visible before you confirm.
            </p>
          </div>
          <ol class="grid gap-6 sm:grid-cols-3">
            <li v-for="(step, index) in steps" :key="step.title">
              <span
                class="grid h-8 w-8 place-items-center rounded-full border border-navy-200 text-xs font-semibold text-navy-800"
                >{{ index + 1 }}</span
              >
              <h3 class="mt-4 font-display text-base font-semibold text-heading">
                {{ step.title }}
              </h3>
              <p class="mt-2 text-sm leading-6 text-body">{{ step.body }}</p>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <!-- Trust ------------------------------------------------------------ -->
    <section class="border-y border-border bg-white py-14 sm:py-16">
      <div class="container-page">
        <div class="max-w-2xl">
          <p class="kicker">Clear rules, visible records</p>
          <h2 class="section-heading mt-3">
            {{ settings.homepage.trust_title }}
          </h2>
        </div>
        <div class="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="item in protections" :key="item.title">
            <span
              class="grid h-10 w-10 place-items-center rounded-lg bg-navy-50 text-navy-700"
            >
              <component :is="item.icon" class="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 class="mt-4 font-display text-base font-semibold text-heading">
              {{ item.title }}
            </h3>
            <p class="mt-2 text-sm leading-6 text-body">{{ item.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Seller CTA ------------------------------------------------------- -->
    <section class="section">
      <div class="container-page">
        <div
          class="relative overflow-hidden rounded-2xl bg-navy-900 px-6 py-10 text-white sm:px-10 sm:py-12"
        >
          <span
            class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-500/80 via-gold-300/60 to-transparent"
            aria-hidden="true"
          />
          <PkarPattern
            color="#EAD3A2"
            variant="temple"
            :opacity="0.09"
            :scale="96"
            class="right-0 w-1/2"
          />
          <div
            class="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between"
          >
            <div class="max-w-xl">
              <p class="text-xs font-semibold text-gold-300">
                For sellers
              </p>
              <h2
                class="mt-3 font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl"
              >
                Have something worth auctioning?
              </h2>
              <p class="mt-3 text-sm leading-6 text-navy-200">
                Create a listing with photographs, condition notes and a
                reserve price. Submit it for review and we will publish it when
                the details are complete.
              </p>
            </div>
            <div class="flex shrink-0 flex-col gap-3 sm:flex-row">
              <router-link
                to="/seller/listings/create"
                class="inline-flex items-center justify-center rounded-lg bg-gold-500 px-6 py-3 text-sm font-semibold text-navy-900 transition-colors hover:bg-gold-400"
              >
                Start a listing
              </router-link>
              <router-link
                to="/seller/listings"
                class="inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Seller studio
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>
  </UserLayout>
</template>
