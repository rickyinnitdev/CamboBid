<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import UserLayout from "@/components/layout/UserLayout.vue";
import AuctionCard from "@/components/auction/AuctionCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import { searchService } from "@/services/searchService";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const query = ref(route.query.q || "");
const results = ref([]);
const total = ref(0);
const loading = ref(false);
const page = ref(1);
const limit = 12;

const filters = ref({
  category: "",
  sort: "newest",
  minPrice: "",
  maxPrice: "",
});

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const activeFilters = computed(() => {
  const chips = [];
  const sort = sortOptions.find((option) => option.value === filters.value.sort);
  if (sort?.value !== "newest") chips.push({ key: "sort", label: `Sort: ${sort.label}` });
  if (filters.value.minPrice) chips.push({ key: "minPrice", label: `Min: $${filters.value.minPrice}` });
  if (filters.value.maxPrice) chips.push({ key: "maxPrice", label: `Max: $${filters.value.maxPrice}` });
  return chips;
});

function removeFilter(key) {
  filters.value[key] = key === "sort" ? "newest" : "";
}

function clearFilters() {
  filters.value.sort = "newest";
  filters.value.minPrice = "";
  filters.value.maxPrice = "";
}

async function doSearch() {
  if (!query.value.trim()) {
    results.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const params = { ...filters.value, page: page.value, limit };
    if (!params.category) delete params.category;
    if (!params.minPrice) delete params.minPrice;
    if (!params.maxPrice) delete params.maxPrice;
    const result = await searchService.search(query.value, params);
    results.value = result.results;
    total.value = result.total;
  } catch (err) {
    console.error("Search failed:", err);
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  router.replace({ query: { q: query.value } });
  doSearch();
}

function nextPage() {
  if (page.value * limit < total.value) {
    page.value++;
    doSearch();
  }
}
function prevPage() {
  if (page.value > 1) {
    page.value--;
    doSearch();
  }
}

onMounted(() => {
  if (query.value) doSearch();
});

watch(filters, () => { page.value = 1; doSearch(); }, { deep: true });
</script>

<template>
  <UserLayout>
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <!-- Search Bar -->
      <form @submit.prevent="handleSearch" class="flex gap-3 mb-8">
        <div class="flex-1">
          <BaseInput
            v-model="query"
            placeholder="Search auctions..."
            type="search"
          />
        </div>
        <BaseButton type="submit" variant="primary">
          {{ t("common.search") }}
        </BaseButton>
      </form>

      <!-- Filters -->
      <div class="sticky top-[145px] z-30 -mx-4 mb-6 border-y border-neutral-200/80 bg-[#f4f6fb]/95 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-[168px] lg:-mx-8 lg:px-8">
        <div class="flex flex-wrap items-end gap-3">
        <div class="w-40">
          <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Sort</label>
          <select
            v-model="filters.sort"
            class="block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
          >
            <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="w-32">
          <BaseInput v-model="filters.minPrice" label="Min Price" type="number" placeholder="0" />
        </div>
        <div class="w-32">
          <BaseInput v-model="filters.maxPrice" label="Max Price" type="number" placeholder="Any" />
        </div>
        </div>
      </div>

      <div v-if="query && !loading" class="mb-6 flex flex-wrap items-center gap-2">
        <p class="text-sm text-neutral-500">{{ total }} {{ t("common.results") }} for "{{ query }}"</p>
        <button
          v-for="chip in activeFilters"
          :key="chip.key"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-900"
          @click="removeFilter(chip.key)"
        >
          {{ chip.label }} <span aria-hidden="true" class="text-neutral-400">×</span>
        </button>
        <button v-if="activeFilters.length" type="button" class="text-xs font-semibold text-neutral-600 underline underline-offset-4" @click="clearFilters">
          Clear all
        </button>
      </div>

      <!-- Results -->
      <div v-if="loading" class="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <BaseSkeleton v-for="i in 8" :key="i" type="card" />
      </div>

      <BaseEmptyState
        v-else-if="results.length === 0 && query"
        title="No Results Found"
        description="Try different keywords or adjust your filters."
        icon="search"
      />

      <BaseEmptyState
        v-else-if="!query"
        title="Search Auctions"
        description="Enter a search term to find items."
        icon="search"
      />

      <template v-else>
        <div class="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AuctionCard v-for="item in results" :key="item.id" :auction="item" />
        </div>

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
