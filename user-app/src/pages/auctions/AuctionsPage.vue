<script setup>
import { ref, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import UserLayout from "@/components/layout/UserLayout.vue";
import AuctionCard from "@/components/auction/AuctionCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import { auctionService } from "@/services/auctionService";

const { t } = useI18n();
const auctions = ref([]);
const total = ref(0);
const loading = ref(true);
const page = ref(1);
const limit = 12;

const filters = ref({
  status: "",
  type: "",
  category: "",
  sort: "ending_soon",
});

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "live", label: "Live" },
  { value: "scheduled", label: "Upcoming" },
  { value: "extended", label: "Extended" },
];

const sortOptions = [
  { value: "ending_soon", label: "Ending Soon" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

async function fetchAuctions() {
  loading.value = true;
  try {
    const params = { ...filters.value, page: page.value, limit };
    if (!params.status) delete params.status;
    if (!params.type) delete params.type;
    if (!params.category) delete params.category;
    const result = await auctionService.getAuctions(params);
    auctions.value = result.auctions;
    total.value = result.total;
  } catch (err) {
    console.error("Failed to load auctions:", err);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchAuctions);
watch(filters, () => { page.value = 1; fetchAuctions(); }, { deep: true });

function nextPage() {
  if (page.value * limit < total.value) {
    page.value++;
    fetchAuctions();
  }
}
function prevPage() {
  if (page.value > 1) {
    page.value--;
    fetchAuctions();
  }
}
</script>

<template>
  <UserLayout>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">The CamboBid edit</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">{{ t("nav.auctions") }}</h1>
          <p class="mt-1 text-sm text-neutral-500">{{ total }} {{ t("common.results") }}</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="sticky top-[145px] z-30 -mx-4 mb-8 border-y border-neutral-200/80 bg-[#f4f6fb]/95 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-[168px] lg:-mx-8 lg:px-8">
        <div class="flex flex-wrap items-end gap-3">
        <div class="w-full sm:w-44">
          <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Status</label>
          <select
            v-model="filters.status"
            class="block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
          >
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="w-full sm:w-44">
          <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Sort</label>
          <select
            v-model="filters.sort"
            class="block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
          >
            <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="w-full sm:w-44">
          <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Type</label>
          <select
            v-model="filters.type"
            class="block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
          >
            <option value="">All Types</option>
            <option value="english">English</option>
            <option value="dutch">Dutch</option>
            <option value="sealed">Sealed</option>
          </select>
        </div>
        </div>
      </div>

      <!-- Results -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <BaseSkeleton v-for="i in 8" :key="i" type="card" />
      </div>

      <BaseEmptyState
        v-else-if="auctions.length === 0"
        title="No Auctions Found"
        description="No auctions match your current filters. Try adjusting your search."
        icon="search"
      />

      <template v-else>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AuctionCard v-for="auction in auctions" :key="auction.id" :auction="auction" />
        </div>

        <!-- Pagination -->
        <div v-if="total > limit" class="flex items-center justify-between mt-8">
          <BaseButton variant="outline" size="sm" :disabled="page <= 1" @click="prevPage">
            {{ t("common.previous") }}
          </BaseButton>
          <span class="text-sm text-muted">
            {{ t("common.page") }} {{ page }} {{ t("common.of") }} {{ Math.ceil(total / limit) }}
          </span>
          <BaseButton variant="outline" size="sm" :disabled="page * limit >= total" @click="nextPage">
            {{ t("common.next") }}
          </BaseButton>
        </div>
      </template>
    </div>
  </UserLayout>
</template>
