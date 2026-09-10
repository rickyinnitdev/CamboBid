<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import BaseBadge from "@/components/base/BaseBadge.vue";
import { auctionService } from "@/services/auctionService";

const { t } = useI18n();

const now = ref(new Date());
const year = ref(now.value.getFullYear());
const month = ref(now.value.getMonth() + 1);
const auctions = ref([]);
const loading = ref(true);

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
  return auctions.value.filter((a) => {
    const startDate = a.start_time?.split("T")[0];
    const endDate = a.end_time?.split("T")[0];
    return startDate <= dateStr && endDate >= dateStr;
  });
}

async function loadCalendar() {
  loading.value = true;
  try {
    auctions.value = await auctionService.getAuctionCalendar(year.value, month.value);
  } catch (err) {
    console.error("Failed to load calendar:", err);
  } finally {
    loading.value = false;
  }
}

function prevMonth() {
  if (month.value === 1) {
    month.value = 12;
    year.value--;
  } else {
    month.value--;
  }
  generateCalendar();
  loadCalendar();
}

function nextMonth() {
  if (month.value === 12) {
    month.value = 1;
    year.value++;
  } else {
    month.value++;
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
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 class="text-2xl font-bold text-heading mb-8">Auction Calendar</h1>

      <!-- Month Nav -->
      <div class="flex items-center justify-between mb-6">
        <BaseButton variant="outline" size="sm" @click="prevMonth">&larr; Previous</BaseButton>
        <h2 class="text-lg font-semibold text-heading">{{ monthNames[month - 1] }} {{ year }}</h2>
        <BaseButton variant="outline" size="sm" @click="nextMonth">Next &rarr;</BaseButton>
      </div>

      <div v-if="loading" class="space-y-4">
        <div v-for="i in 5" :key="i" class="h-16 bg-surface rounded-lg animate-pulse" />
      </div>

      <BaseCard v-else>
        <div class="p-4">
          <div class="grid grid-cols-7 gap-px bg-border">
            <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="bg-surface p-2 text-center text-xs font-semibold text-heading">
              {{ day }}
            </div>

            <div v-for="i in firstDayOffset" :key="'empty-' + i" class="bg-white p-2 min-h-[80px]" />

            <div
              v-for="day in daysInMonth"
              :key="day"
              class="bg-white p-2 min-h-[80px] hover:bg-surface/50 transition-colors"
            >
              <div class="text-xs font-medium text-muted mb-1">{{ day }}</div>
              <div class="space-y-1">
                <router-link
                  v-for="auction in getAuctionsForDay(day).slice(0, 2)"
                  :key="auction.id"
                  :to="`/auctions/${auction.id}`"
                  class="block text-[10px] leading-tight px-1 py-0.5 rounded truncate"
                  :class="auction.status === 'live' ? 'bg-success/10 text-success' : 'bg-navy-700/10 text-navy-700'"
                >
                  {{ auction.listings?.title || "Auction" }}
                </router-link>
                <span
                  v-if="getAuctionsForDay(day).length > 2"
                  class="text-[10px] text-muted px-1"
                >
                  +{{ getAuctionsForDay(day).length - 2 }} more
                </span>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>
  </UserLayout>
</template>
