<script setup>
import { onMounted, ref } from "vue";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import { marketplace } from "@/data/marketplace";
import { getAuctionState } from "@/utils/auctionPresentation";

const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1);
const auctions = ref([]);
const loading = ref(true);
const error = ref("");

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const daysInMonth = ref([]);
const firstDayOffset = ref(0);

function generateCalendar() {
  const total = new Date(year.value, month.value, 0).getDate();
  const firstDay = new Date(year.value, month.value - 1, 1).getDay();
  daysInMonth.value = Array.from({ length: total }, (_, i) => i + 1);
  firstDayOffset.value = firstDay;
}

function getAuctionsForDay(day) {
  const dateStr = `${year.value}-${String(month.value).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return auctions.value.filter((auction) => {
    const startDate = auction.start_time?.split("T")[0];
    const endDate = auction.end_time?.split("T")[0];
    return startDate <= dateStr && endDate >= dateStr;
  });
}

function dayTone(auction) {
  const state = getAuctionState(auction);
  if (state.key === "live" || state.key === "ending_soon")
    return "bg-emerald-50 text-emerald-800";
  if (state.key === "upcoming") return "bg-navy-50 text-navy-800";
  return "bg-slate-100 text-slate-600";
}

async function loadCalendar() {
  loading.value = true;
  error.value = "";
  try {
    auctions.value = await marketplace.getAuctionCalendar(year.value, month.value);
  } catch (err) {
    error.value = err.message || "Failed to load the calendar.";
  } finally {
    loading.value = false;
  }
}

function prevMonth() {
  if (month.value === 1) {
    month.value = 12;
    year.value -= 1;
  } else {
    month.value -= 1;
  }
  generateCalendar();
  loadCalendar();
}

function nextMonth() {
  if (month.value === 12) {
    month.value = 1;
    year.value += 1;
  } else {
    month.value += 1;
  }
  generateCalendar();
  loadCalendar();
}

onMounted(() => {
  generateCalendar();
  loadCalendar();
});
</script>

<template>
  <UserLayout>
    <div class="page-container pt-5 sm:pt-7">
      <header class="page-header mb-6">
        <div>
          <p class="kicker">Plan your bids</p>
          <h1 class="page-title mt-3">Auction calendar</h1>
          <p class="page-subtitle mt-2">
            See when lots open and close. Select a lot to review its details
            before bidding.
          </p>
        </div>
        <router-link
          to="/auctions"
          class="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900"
        >
          Browse all auctions
        </router-link>
      </header>

      <div class="mb-6 flex items-center justify-between gap-4">
        <BaseButton variant="outline" size="sm" @click="prevMonth">
          Previous
        </BaseButton>
        <h2 class="font-display text-lg font-semibold text-heading">
          {{ monthNames[month - 1] }} {{ year }}
        </h2>
        <BaseButton variant="outline" size="sm" @click="nextMonth">
          Next
        </BaseButton>
      </div>

      <div v-if="loading" class="space-y-4">
        <BaseSkeleton v-for="i in 4" :key="i" :lines="3" />
      </div>

      <div v-else-if="error" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {{ error }}
        <button type="button" class="ml-2 font-semibold underline" @click="loadCalendar">Try again</button>
      </div>

      <div v-else class="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
        <div class="min-w-[760px]">
          <div class="grid grid-cols-7 gap-px bg-border">
            <div
              v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
              :key="day"
              class="bg-surface px-2 py-2.5 text-center text-xs font-semibold text-body"
            >
              {{ day }}
            </div>

            <div
              v-for="i in firstDayOffset"
              :key="'empty-' + i"
              class="min-h-[104px] bg-white p-2"
            />

            <div
              v-for="day in daysInMonth"
              :key="day"
              class="min-h-[104px] bg-white p-2 transition-colors hover:bg-surface/60"
            >
              <div class="mb-1.5 text-xs font-medium text-muted">{{ day }}</div>
              <div class="space-y-1">
                <router-link
                  v-for="auction in getAuctionsForDay(day).slice(0, 2)"
                  :key="auction.id"
                  :to="`/auctions/${auction.id}`"
                  :class="[
                    'block truncate rounded px-1.5 py-1 text-[10px] font-medium leading-tight',
                    dayTone(auction),
                  ]"
                >
                  {{ auction.listings?.title || "Auction" }}
                </router-link>
                <span
                  v-if="getAuctionsForDay(day).length > 2"
                  class="block px-1.5 text-[10px] text-muted"
                >
                  +{{ getAuctionsForDay(day).length - 2 }} more
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span class="inline-flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full bg-emerald-600" /> Live
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full bg-navy-600" /> Upcoming
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full bg-slate-400" /> Ended
        </span>
      </div>
    </div>
  </UserLayout>
</template>
