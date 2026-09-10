<script setup>
import { computed } from "vue";
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
const isLive = computed(() => ["live", "extended"].includes(props.auction.status));
const isEnded = computed(() => props.auction.status === "closed");
const isScheduled = computed(() => props.auction.status === "scheduled");
const categoryName = computed(() => listing.value.categories?.name || "Curated lot");
</script>

<template>
  <router-link :to="`/auctions/${auction.id}`" class="group block">
    <article class="rounded-[2rem] bg-white p-3 shadow-sm border border-slate-200/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10 transition-all duration-300">
      <div class="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-slate-100 to-slate-200">
        <img
          v-if="imageUrl"
          :src="imageUrl"
          :alt="listing.title"
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div v-else class="h-full w-full grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#dbeafe,transparent_35%),linear-gradient(135deg,#f8fafc,#e2e8f0)]">
          <svg class="w-16 h-16 text-blue-700/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8v8m9-4a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <button class="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-blue-700 shadow-sm hover:scale-105 transition-transform" @click.prevent>
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
          </svg>
        </button>

        <div class="absolute left-3 top-3 flex items-center gap-2">
          <span v-if="isLive" class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-black text-white shadow-lg shadow-emerald-600/20">
            <span class="relative flex h-2 w-2"><span class="absolute h-full w-full animate-ping rounded-full bg-white opacity-75" /><span class="relative h-2 w-2 rounded-full bg-white" /></span>
            LIVE
          </span>
          <span v-else-if="isScheduled" class="rounded-full bg-blue-700 px-3 py-1.5 text-xs font-black text-white">UPCOMING</span>
          <span v-else-if="isEnded" class="rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-black text-white">ENDED</span>
          <span v-if="auction.type !== 'english'" class="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold capitalize text-slate-700">{{ auction.type }}</span>
        </div>
      </div>

      <div class="px-1 pt-4 pb-2">
        <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{{ categoryName }}</p>
        <h3 class="mt-1 min-h-[3rem] text-base font-bold leading-snug text-slate-950 group-hover:text-blue-700 transition-colors line-clamp-2">
          {{ listing.title || "Untitled auction lot" }}
        </h3>

        <div class="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current bid</p>
            <p class="mt-1 font-mono text-xl font-black text-slate-950">
              ${{ Number(auction.current_price || 0).toLocaleString() }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">{{ isScheduled ? "Starts" : "Ends" }}</p>
            <CountdownTimer v-if="isLive" :end-time="auction.end_time" :status="auction.status" size="sm" class="mt-1 justify-end" />
            <p v-else class="mt-1 text-xs font-semibold text-slate-600">{{ new Date(isScheduled ? auction.start_time : auction.end_time).toLocaleDateString() }}</p>
          </div>
        </div>

        <div class="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Verified seller</span>
          <span class="font-semibold text-blue-700">View lot</span>
        </div>
      </div>
    </article>
  </router-link>
</template>
