<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import UserLayout from "@/components/layout/UserLayout.vue";
import AuctionCard from "@/components/auction/AuctionCard.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import KhmerDivider from "@/components/base/KhmerDivider.vue";
import { marketplace } from "@/data/marketplace";

const route = useRoute();
const router = useRouter();

const query = ref(String(route.query.q || ""));
const results = ref([]);
const categories = ref([]);
const total = ref(0);
const loading = ref(false);
const searched = ref(false);
const error = ref("");
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
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

const activeFilters = computed(() => {
  const chips = [];
  const sort = sortOptions.find((option) => option.value === filters.value.sort);
  if (filters.value.category)
    chips.push({
      key: "category",
      label: `Category: ${
        categories.value.find((c) => c.slug === filters.value.category)?.name ||
        filters.value.category
      }`,
    });
  if (filters.value.sort !== "newest")
    chips.push({ key: "sort", label: `Sort: ${sort?.label}` });
  if (filters.value.minPrice)
    chips.push({ key: "minPrice", label: `Min: $${filters.value.minPrice}` });
  if (filters.value.maxPrice)
    chips.push({ key: "maxPrice", label: `Max: $${filters.value.maxPrice}` });
  return chips;
});

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)));

function removeFilter(key) {
  filters.value[key] = key === "sort" ? "newest" : "";
}

function clearFilters() {
  filters.value.sort = "newest";
  filters.value.category = "";
  filters.value.minPrice = "";
  filters.value.maxPrice = "";
}

async function doSearch() {
  if (!query.value.trim()) {
    results.value = [];
    total.value = 0;
    searched.value = false;
    return;
  }
  loading.value = true;
  error.value = "";
  searched.value = true;
  try {
    const params = { ...filters.value, page: page.value, limit };
    if (!params.category) delete params.category;
    if (!params.minPrice) delete params.minPrice;
    if (!params.maxPrice) delete params.maxPrice;
    const result = await marketplace.search(query.value.trim(), params);
    results.value = result.results;
    total.value = result.total;
  } catch (err) {
    error.value = err.message || "Search failed. Please try again.";
    results.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  router.replace({ query: query.value.trim() ? { q: query.value.trim() } : {} });
  doSearch();
}

function goToPage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value) return;
  page.value = nextPage;
  doSearch();
}

watch(
  filters,
  () => {
    page.value = 1;
    doSearch();
  },
  { deep: true },
);

onMounted(async () => {
  try {
    categories.value = await marketplace.getCategories();
  } catch (err) {
    if (import.meta.env.DEV)
      console.error("Failed to load categories:", err);
  }
  if (query.value) doSearch();
});
</script>

<template>
  <UserLayout>
    <div class="page-container pt-5 sm:pt-7">
      <KhmerDivider class="mb-6" />
      <header class="page-header mb-6">
        <div>
          <p class="kicker">Search</p>
          <h1 class="page-title mt-3">
            {{ query ? `Results for “${query}”` : "Search auctions" }}
          </h1>
          <p class="page-subtitle mt-2">
            Search lot titles and descriptions, then narrow by category or
            price.
          </p>
        </div>
        <p v-if="searched" class="text-sm text-muted">
          <span class="numeric font-semibold text-heading">{{ total }}</span>
          {{ total === 1 ? "result" : "results" }}
        </p>
      </header>

      <form
        class="flex flex-col gap-3 sm:flex-row"
        role="search"
        @submit.prevent="handleSearch"
      >
        <div class="relative flex-1">
          <label for="search-input" class="sr-only">Search auctions</label>
          <svg
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            id="search-input"
            v-model="query"
            type="search"
            class="input h-11 pl-9"
            placeholder="Search lots, makers or eras"
          />
        </div>
        <button
          type="submit"
          class="inline-flex h-11 items-center justify-center rounded-lg bg-navy-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
        >
          Search
        </button>
      </form>

      <div class="mt-6 rounded-2xl border border-border bg-white p-4">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label for="search-category" class="meta-label mb-1.5 block">Category</label>
            <select id="search-category" v-model="filters.category" class="select">
              <option value="">All categories</option>
              <option v-for="category in categories" :key="category.slug" :value="category.slug">
                {{ category.name }}
              </option>
            </select>
          </div>
          <div>
            <label for="search-sort" class="meta-label mb-1.5 block">Sort</label>
            <select id="search-sort" v-model="filters.sort" class="select">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div>
            <label for="search-min" class="meta-label mb-1.5 block">Min price</label>
            <input
              id="search-min"
              v-model="filters.minPrice"
              type="number"
              min="0"
              step="1"
              class="input"
              placeholder="USD"
            />
          </div>
          <div>
            <label for="search-max" class="meta-label mb-1.5 block">Max price</label>
            <input
              id="search-max"
              v-model="filters.maxPrice"
              type="number"
              min="0"
              step="1"
              class="input"
              placeholder="USD"
            />
          </div>
        </div>

        <div v-if="activeFilters.length" class="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <button
            v-for="chip in activeFilters"
            :key="chip.key"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-800"
            @click="removeFilter(chip.key)"
          >
            {{ chip.label }}
            <span aria-hidden="true" class="text-navy-500">×</span>
          </button>
          <button
            type="button"
            class="text-xs font-semibold text-muted underline decoration-slate-300 underline-offset-4 hover:text-heading"
            @click="clearFilters"
          >
            Clear all
          </button>
        </div>
      </div>

      <div v-if="loading" class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <BaseSkeleton v-for="i in 8" :key="i" type="card" />
      </div>

      <div v-else-if="error" role="alert" class="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {{ error }}
        <button type="button" class="ml-2 font-semibold underline" @click="doSearch">Try again</button>
      </div>

      <BaseEmptyState
        v-else-if="searched && results.length === 0"
        class="mt-8"
        title="No lots match this search"
        description="Try a broader term, remove a price limit, or browse all auctions."
        icon="search"
      >
        <template #action>
          <router-link to="/auctions" class="mt-5 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-heading hover:border-navy-300">
            Browse all auctions
          </router-link>
        </template>
      </BaseEmptyState>

      <BaseEmptyState
        v-else-if="!searched"
        class="mt-8"
        title="Start with a word or phrase"
        description="Search for a maker, category or object. Results show live, upcoming and ended lots."
        icon="search"
      />

      <template v-else>
        <div class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AuctionCard v-for="auction in results" :key="auction.id" :auction="auction" />
        </div>

        <nav v-if="totalPages > 1" class="mt-10 flex items-center justify-between border-t border-border pt-6" aria-label="Search pagination">
          <button
            type="button"
            class="rounded-lg border border-line px-3 py-2 text-sm font-medium text-heading hover:border-navy-300 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="page === 1"
            @click="goToPage(page - 1)"
          >
            Previous
          </button>
          <p class="text-sm text-muted">
            Page <span class="numeric font-semibold text-heading">{{ page }}</span> of
            <span class="numeric">{{ totalPages }}</span>
          </p>
          <button
            type="button"
            class="rounded-lg border border-line px-3 py-2 text-sm font-medium text-heading hover:border-navy-300 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="page >= totalPages"
            @click="goToPage(page + 1)"
          >
            Next
          </button>
        </nav>
      </template>
    </div>
  </UserLayout>
</template>
