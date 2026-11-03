<script setup>
import { computed } from "vue";
import AuctionStatusBadge from "./AuctionStatusBadge.vue";
import CountdownTimer from "./CountdownTimer.vue";
import PriceDisplay from "./PriceDisplay.vue";
import {
  getAuctionState,
  getBidCount,
  getListing,
  getPrimaryImage,
  getReserveLabel,
  getSellerName,
} from "@/utils/auctionPresentation";
import { formatDate } from "@/utils/format";

const props = defineProps({
  auction: { type: Object, required: true },
});

const listing = computed(() => getListing(props.auction));
const state = computed(() => getAuctionState(props.auction));
const image = computed(() => getPrimaryImage(listing.value));
const category = computed(() => listing.value.categories?.name || "Curated lot");
const bidCount = computed(() => getBidCount(props.auction));
const reserve = computed(() => getReserveLabel(props.auction));
const seller = computed(() => getSellerName(props.auction));

const timingLabel = computed(() => {
  if (state.value.key === "upcoming") return "Opens";
  if (state.value.isEnded) return "Closed";
  return "Ends";
});

const dateLabel = computed(() => {
  if (state.value.key === "upcoming")
    return formatDate(props.auction.start_time);
  if (state.value.isEnded) return formatDate(props.auction.end_time);
  return "";
});
</script>

<template>
  <router-link
    :to="`/auctions/${auction.id}`"
    class="group flex h-full flex-col rounded-2xl border border-border bg-white p-2.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2"
  >
    <div
      class="relative aspect-[4/5] overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-200"
    >
      <img
        v-if="image"
        :src="image"
        :alt="listing.title"
        class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        :class="state.isEnded && 'saturate-[0.85]'"
        loading="lazy"
        decoding="async"
      />
      <div v-else class="grid h-full w-full place-items-center">
        <svg
          class="h-14 w-14 text-navy-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.2"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>

      <div class="absolute left-2.5 top-2.5">
        <AuctionStatusBadge :state="state" size="sm" />
      </div>
    </div>

    <div class="flex flex-1 flex-col px-1 pb-1 pt-3.5">
      <p class="text-[11px] font-medium text-muted">{{ category }}</p>
      <h3
        class="mt-1 line-clamp-2 min-h-[2.6rem] font-display text-[17px] font-semibold leading-snug text-heading"
      >
        {{ listing.title || "Untitled lot" }}
      </h3>

      <div class="mt-auto pt-4">
        <div class="flex items-end justify-between gap-3">
          <div class="min-w-0">
            <PriceDisplay
              :amount="auction.current_price"
              :label="state.priceLabel"
              size="md"
            />
            <p class="mt-1.5 text-xs text-muted">
              {{ bidCount }} {{ bidCount === 1 ? "bid" : "bids" }}
              <span v-if="reserve" class="text-slate-400"> · </span>
              <span v-if="reserve" :class="auction.reserve_met ? 'text-emerald-700' : 'text-amber-700'">
                {{ reserve }}
              </span>
            </p>
          </div>

          <div class="shrink-0 text-right">
            <p class="meta-label">{{ timingLabel }}</p>
            <CountdownTimer
              v-if="!state.isEnded && state.key !== 'upcoming'"
              :end-time="auction.end_time"
              :status="auction.status"
              size="sm"
              class="mt-1"
            />
            <p v-else class="mt-1 text-sm font-medium text-body">
              {{ dateLabel }}
            </p>
          </div>
        </div>

        <div
          class="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3"
        >
          <span class="min-w-0 truncate text-xs text-muted">{{ seller }}</span>
          <span
            class="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-heading transition-colors group-hover:text-navy-700"
          >
            {{ state.actionLabel }}
            <svg
              class="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
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
          </span>
        </div>
      </div>
    </div>
  </router-link>
</template>
