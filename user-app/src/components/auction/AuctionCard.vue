<script setup>
import { computed } from "vue";
import dayjs from "dayjs";
import CountdownTimer from "./CountdownTimer.vue";

const props = defineProps({
  auction: { type: Object, required: true },
});

const listing = computed(() => props.auction.listings || {});
const imageUrl = computed(() => {
  const images = listing.value.images;
  if (Array.isArray(images) && images.length > 0) return typeof images[0] === "string" ? images[0] : images[0]?.url;
  return null;
});
const isEnded = computed(() => {
  const endTime = props.auction.end_time ? new Date(props.auction.end_time).getTime() : NaN;
  return props.auction.status === "closed" || (Number.isFinite(endTime) && endTime <= Date.now());
});
const isLive = computed(() => !isEnded.value && ["live", "extended"].includes(props.auction.status));
const isScheduled = computed(() => props.auction.status === "scheduled");
const categoryName = computed(() => listing.value.categories?.name || "Curated lot");
const bidCount = computed(() => {
  if (typeof props.auction.bid_count === "number") return props.auction.bid_count;
  return Number(props.auction.bids?.[0]?.count || 0);
});
const reserveLabel = computed(() => {
  if (props.auction.reserve_met) return "Reserve met";
  if (listing.value.reserve_price == null) return "No reserve";
  return "";
});
const endLabel = computed(() => {
  if (isScheduled.value) return "Starts";
  if (isEnded.value) return "Closed";
  return "Ends";
});
const closedDateLabel = computed(() => {
  if (!props.auction.end_time) return "Closed";
  return `Closed ${dayjs(props.auction.end_time).format("MMM D")}`;
});
</script>

<template>
  <router-link :to="`/auctions/${auction.id}`" class="group block">
    <article
      class="rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
      :class="isEnded ? 'opacity-80' : ''"
    >
      <div class="relative aspect-[4/3] overflow-hidden rounded-t-2xl rounded-b-xl border border-neutral-100 bg-gradient-to-br from-slate-100 to-slate-200 ring-1 ring-black/5">
        <img
          v-if="imageUrl"
          :src="imageUrl"
          :alt="listing.title"
          class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          :class="isEnded ? 'grayscale-[0.2] group-hover:grayscale' : ''"
        />
        <div v-else class="h-full w-full grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#dbeafe,transparent_35%),linear-gradient(135deg,#f8fafc,#e2e8f0)]">
          <svg class="w-16 h-16 text-blue-700/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8v8m9-4a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <button
          type="button"
          class="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-white/50 bg-white/65 text-neutral-800 shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:bg-white/90"
          aria-label="Save lot"
          @click.prevent
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
          </svg>
        </button>

        <div class="absolute left-3 top-3 flex items-center gap-2">
          <span v-if="isLive" class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <span class="relative flex h-2 w-2"><span class="absolute h-full w-full animate-ping rounded-full bg-white opacity-75" /><span class="relative h-2 w-2 rounded-full bg-white" /></span>
            LIVE
          </span>
          <span v-else-if="isScheduled" class="rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-neutral-800 shadow-sm backdrop-blur-md">UPCOMING</span>
          <span v-else-if="isEnded" class="rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-md">ENDED</span>
          <span v-if="auction.type !== 'english'" class="rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold capitalize text-neutral-700 shadow-sm backdrop-blur-md">{{ auction.type }}</span>
        </div>
      </div>

      <div class="px-1 pt-4 pb-2">
        <p class="text-xs font-semibold uppercase tracking-wider text-neutral-500">{{ categoryName }}</p>
        <h3 class="mt-1 min-h-[3rem] line-clamp-2 text-base font-semibold leading-snug text-neutral-900 transition-colors">
          {{ listing.title || "Untitled auction lot" }}
        </h3>

        <div class="mt-4 grid min-w-0 grid-cols-2 gap-3 overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 p-3">
          <div class="min-w-0 max-w-full overflow-hidden">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Current bid</p>
            <p class="mt-1 min-w-0 max-w-full truncate font-mono text-lg font-bold tabular-nums text-neutral-900">
              ${{ Number(auction.current_price || 0).toLocaleString() }}
            </p>
            <div class="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-medium text-neutral-500">
              <span>{{ bidCount }} {{ bidCount === 1 ? "bid" : "bids" }}</span>
              <span v-if="reserveLabel" class="rounded-full border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] text-neutral-600">
                {{ reserveLabel }}
              </span>
            </div>
          </div>
          <div class="min-w-0 max-w-full overflow-hidden text-right">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">{{ endLabel }}</p>
            <CountdownTimer
              v-if="isLive"
              :end-time="auction.end_time"
              :status="auction.status"
              size="sm"
              class="mt-1 min-w-0 max-w-full"
            />
            <p v-else-if="isEnded" class="mt-1 min-w-0 max-w-full truncate text-xs font-semibold text-neutral-600">
              {{ closedDateLabel }}
            </p>
            <p v-else class="mt-1 min-w-0 max-w-full truncate text-xs font-semibold text-neutral-600">
              {{ new Date(isScheduled ? auction.start_time : auction.end_time).toLocaleDateString() }}
            </p>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <span class="inline-flex min-w-0 items-center gap-1.5 text-xs text-neutral-600">
            <svg class="h-4 w-4 flex-shrink-0 text-blue-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l2.1 1.5 2.55-.1.9 2.4 2.1 1.45-.9 2.4.9 2.4-2.1 1.45-.9 2.4-2.55-.1L12 22l-2.1-1.5-2.55.1-.9-2.4-2.1-1.45.9-2.4-.9-2.4 2.1-1.45.9-2.4 2.55.1L12 2zm-1.1 13.5l5.2-5.2-1.4-1.4-3.8 3.8-1.6-1.6-1.4 1.4 3 3z" />
            </svg>
            <span class="truncate">Verified seller</span>
          </span>
          <span
            class="inline-flex flex-shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
            :class="isEnded
              ? 'border border-neutral-300 bg-transparent text-neutral-700 group-hover:bg-neutral-50'
              : 'bg-neutral-900 text-white group-hover:bg-blue-700'"
          >
            {{ isEnded ? "View Results" : "Place Bid" }}
          </span>
        </div>
      </div>
    </article>
  </router-link>
</template>
