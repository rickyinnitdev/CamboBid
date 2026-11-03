<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import UserLayout from "@/components/layout/UserLayout.vue";
import AuctionCard from "@/components/auction/AuctionCard.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import { marketplace } from "@/data/marketplace";

const route = useRoute();
const router = useRouter();

const auctions = ref([]);
const categories = ref([]);
const total = ref(0);
const loading = ref(true);
const error = ref("");
const page = ref(1);
const limit = 12;
const query = ref(String(route.query.q || ""));

const filters = ref({
  status: String(route.query.status || "active"),
  type: "",
  category: String(route.query.category || ""),
  sort: String(route.query.sort || "ending_soon"),
});

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "live", label: "Live" },
  { value: "ending_soon", label: "Ending soon" },
  { value: "scheduled", label: "Upcoming" },
  { value: "closed", label: "Ended" },
  { value: "all", label: "All lots" },
];

const sortOptions = [
  { value: "ending_soon", label: "Closing time" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

const typeOptions = [
  { value: "", label: "All types" },
  { value: "english", label: "English" },
  { value: "dutch", label: "Dutch" },
  { value: "sealed", label: "Sealed" },
];

const statusLabel = computed(
  () =>
    statusOptions.find((option) => option.value === filters.value.status)
      ?.label || "Active",
);

const categoryLabel = computed(
  () =>
    categories.value.find((category) => category.slug === filters.value.category)
      ?.name || "",
);

const activeFilters = computed(() => {
  const chips = [];
  if (filters.value.status !== "active")
    chips.push({ key: "status", label: `Status: ${statusLabel.value}` });
  if (filters.value.category)
    chips.push({ key: "category", label: `Category: ${categoryLabel.value}` });
  if (filters.value.type)
    chips.push({
      key: "type",
      label: `Type: ${
        typeOptions.find((option) => option.value === filters.value.type)?.label
      }`,
    });
  if (filters.value.sort !== "ending_soon")
    chips.push({
      key: "sort",
      label: `Sort: ${
        sortOptions.find((option) => option.value === filters.value.sort)?.label
      }`,
    });
  if (query.value.trim())
    chips.push({ key: "q", label: `Search: “${query.value.trim()}”` });
  return chips;
});

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)));

const pageNumbers = computed(() => {
  const pages = [];
  const start = Math.max(1, Math.min(page.value - 2, totalPages.value - 4));
  const end = Math.min(totalPages.value, start + 4);
  for (let i = start; i <= end; i += 1) pages.push(i);
  return pages;
});

function removeFilter(key) {
  if (key === "q") query.value = "";
  else if (key === "status") filters.value.status = "active";
  else if (key === "sort") filters.value.sort = "ending_soon";
  else filters.value[key] = "";
}

function clearFilters() {
  query.value = "";
  filters.value.status = "active";
  filters.value.type = "";
  filters.value.category = "";
  filters.value.sort = "ending_soon";
}

function syncQuery() {
  const next = {};
  if (filters.value.status !== "active") next.status = filters.value.status;
  if (filters.value.category) next.category = filters.value.category;
  if (filters.value.type) next.type = filters.value.type;
  if (filters.value.sort !== "ending_soon") next.sort = filters.value.sort;
  if (query.value.trim()) next.q = query.value.trim();
  const current = route.query;
  const same =
    Object.keys(next).length === Object.keys(current).length &&
    Object.entries(next).every(([key, value]) => current[key] === value);
  if (!same) router.replace({ query: next });
}

async function fetchAuctions() {
  loading.value = true;
  error.value = "";
  try {
    const result = await marketplace.getAuctions({
      ...filters.value,
      page: page.value,
      limit,
      query: query.value.trim() || undefined,
    });
    auctions.value = result.auctions;
    total.value = result.total;
  } catch (err) {
    error.value = err.message || "Failed to load auctions.";
    auctions.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function applySearch() {
  page.value = 1;
  syncQuery();
  fetchAuctions();
}

function goToPage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value)
    return;
  page.value = nextPage;
  fetchAuctions();
  if (typeof window !== "undefined")
    window.scrollTo({ top: 0, behavior: "smooth" });
}

watch(
  filters,
  () => {
    page.value = 1;
    syncQuery();
    fetchAuctions();
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
  await fetchAuctions();
});
</script>

<template>
  <UserLayout>
    <div class="page-container pt-5 sm:pt-7">
      <header class="page-header mb-6">
        <div>
          <p class="kicker">Browse the saleroom</p>
          <h1 class="page-title mt-3">Auctions</h1>
          <p class="page-subtitle mt-2">
            Live, upcoming and past lots. Filter by status, category or closing
            time.
          </p>
        </div>
        <p class="text-sm text-muted">
          <span class="numeric font-semibold text-heading">{{ total }}</span>
          {{ total === 1 ? "lot" : "lots" }}
        </p>
      </header>

      <div
        class="sticky top-[72px] z-30 -mx-4 border-y border-border bg-surface/95 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        <form
          class="flex flex-col gap-3 lg:flex-row lg:items-end"
          role="search"
          @submit.prevent="applySearch"
        >
          <div class="min-w-0 flex-1">
            <label for="auction-search" class="meta-label mb-1.5 block"
              >Search lots</label
            >
            <div class="relative">
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
                id="auction-search"
                v-model="query"
                type="search"
                class="input pl-9"
                placeholder="Search by title or description"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:items-end">
            <div class="min-w-0">
              <label for="filter-category" class="meta-label mb-1.5 block"
                >Category</label
              >
              <select id="filter-category" v-model="filters.category" class="select">
                <option value="">All categories</option>
                <option
                  v-for="category in categories"
                  :key="category.slug"
                  :value="category.slug"
                >
                  {{ category.name }}
                </option>
              </select>
            </div>
            <div class="min-w-0">
              <label for="filter-type" class="meta-label mb-1.5 block"
                >Type</label
              >
              <select id="filter-type" v-model="filters.type" class="select">
                <option
                  v-for="option in typeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
            <div class="col-span-2 min-w-0 sm:col-span-1">
              <label for="filter-sort" class="meta-label mb-1.5 block"
                >Sort</label
              >
              <select id="filter-sort" v-model="filters.sort" class="select">
                <option
                  v-for="option in sortOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            class="inline-flex h-[42px] items-center justify-center rounded-lg bg-navy-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
          >
            Search
          </button>
        </form>

        <div class="mt-3 flex flex-wrap items-center gap-1.5">
          <button
            v-for="option in statusOptions"
            :key="option.value"
            type="button"
            :class="[
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              filters.status === option.value
                ? 'bg-navy-900 text-white'
                : 'border border-line bg-white text-body hover:border-navy-300 hover:text-heading',
            ]"
            :aria-pressed="filters.status === option.value"
            @click="filters.status = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <div
          v-if="activeFilters.length"
          class="mt-3 flex flex-wrap items-center gap-2"
        >
          <button
            v-for="chip in activeFilters"
            :key="chip.key"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-800 transition-colors hover:border-navy-300"
            @click="removeFilter(chip.key)"
          >
            {{ chip.label }}
            <span aria-hidden="true" class="text-navy-500">×</span>
            <span class="sr-only">Remove filter</span>
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

      <div
        v-else-if="error"
        role="alert"
        class="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        {{ error }}
        <button
          type="button"
          class="ml-2 font-semibold underline"
          @click="fetchAuctions"
        >
          Try again
        </button>
      </div>

      <BaseEmptyState
        v-else-if="auctions.length === 0"
        class="mt-8"
        title="No lots match these filters"
        description="Try a different category or status, or clear the filters to see every active lot."
        icon="search"
      >
        <template #action>
          <button
            type="button"
            class="mt-5 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-heading hover:border-navy-300"
            @click="clearFilters"
          >
            Clear filters
          </button>
        </template>
      </BaseEmptyState>

      <template v-else>
        <div class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AuctionCard
            v-for="auction in auctions"
            :key="auction.id"
            :auction="auction"
          />
        </div>

        <nav
          v-if="totalPages > 1"
          class="mt-10 flex items-center justify-between gap-4 border-t border-border pt-6"
          aria-label="Auction pagination"
        >
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-heading transition-colors hover:border-navy-300 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="page === 1"
            @click="goToPage(page - 1)"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <div class="hidden items-center gap-1 sm:flex">
            <button
              v-for="number in pageNumbers"
              :key="number"
              type="button"
              :class="[
                'numeric grid h-9 w-9 place-items-center rounded-lg text-sm font-medium transition-colors',
                number === page
                  ? 'bg-navy-900 text-white'
                  : 'text-body hover:bg-surface hover:text-heading',
              ]"
              :aria-current="number === page ? 'page' : undefined"
              @click="goToPage(number)"
            >
              {{ number }}
            </button>
          </div>

          <p class="text-sm text-muted sm:hidden">
            Page <span class="numeric font-semibold text-heading">{{ page }}</span>
            of <span class="numeric">{{ totalPages }}</span>
          </p>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-heading transition-colors hover:border-navy-300 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="page >= totalPages"
            @click="goToPage(page + 1)"
          >
            Next
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </nav>
      </template>
    </div>
  </UserLayout>
</template>
