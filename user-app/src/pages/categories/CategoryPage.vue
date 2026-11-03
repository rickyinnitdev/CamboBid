<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import UserLayout from "@/components/layout/UserLayout.vue";
import AuctionCard from "@/components/auction/AuctionCard.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import { marketplace } from "@/data/marketplace";

const route = useRoute();

const auctions = ref([]);
const categories = ref([]);
const total = ref(0);
const loading = ref(true);
const error = ref("");
const page = ref(1);
const limit = 12;
const slug = ref(String(route.params.slug || ""));
const status = ref("active");
const sort = ref("ending_soon");

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "live", label: "Live" },
  { value: "scheduled", label: "Upcoming" },
  { value: "closed", label: "Ended" },
];

const sortOptions = [
  { value: "ending_soon", label: "Closing time" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

const category = computed(() =>
  categories.value.find((item) => item.slug === slug.value),
);

const categoryName = computed(() => {
  if (category.value?.name) return category.value.name;
  return slug.value
    .replace(/-/g, " ")
    .replace(/^\w/, (character) => character.toUpperCase());
});

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)));

async function loadCategory() {
  loading.value = true;
  error.value = "";
  try {
    const [result, categoryData] = await Promise.all([
      marketplace.getAuctions({
        category: slug.value,
        status: status.value,
        sort: sort.value,
        page: page.value,
        limit,
      }),
      marketplace.getCategories(),
    ]);
    auctions.value = result.auctions;
    total.value = result.total;
    categories.value = categoryData;
  } catch (err) {
    error.value = err.message || "Failed to load this category.";
    auctions.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function goToPage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value) return;
  page.value = nextPage;
  loadCategory();
}

watch(status, () => {
  page.value = 1;
  loadCategory();
});

watch(sort, () => {
  page.value = 1;
  loadCategory();
});

watch(
  () => route.params.slug,
  (newSlug) => {
    slug.value = String(newSlug || "");
    page.value = 1;
    status.value = "active";
    loadCategory();
  },
);

onMounted(loadCategory);
</script>

<template>
  <UserLayout>
    <div class="page-container pt-5 sm:pt-7">
      <header class="page-header mb-6">
        <div>
          <p class="kicker">Category</p>
          <h1 class="page-title mt-3">{{ categoryName }}</h1>
          <p class="page-subtitle mt-2">
            {{ total }} {{ total === 1 ? "lot" : "lots" }} in this department.
            Filter by status or closing time.
          </p>
        </div>
        <div class="w-full sm:w-52">
          <label for="category-sort" class="meta-label mb-1.5 block">Sort by</label>
          <select id="category-sort" v-model="sort" class="select">
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </header>

      <div class="mb-6 flex flex-wrap gap-1.5">
        <button
          v-for="option in statusOptions"
          :key="option.value"
          type="button"
          :class="[
            'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            status === option.value
              ? 'bg-navy-900 text-white'
              : 'border border-line bg-white text-body hover:border-navy-300 hover:text-heading',
          ]"
          :aria-pressed="status === option.value"
          @click="status = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <div v-if="loading" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <BaseSkeleton v-for="i in 8" :key="i" type="card" />
      </div>

      <div v-else-if="error" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {{ error }}
        <button type="button" class="ml-2 font-semibold underline" @click="loadCategory">Try again</button>
      </div>

      <BaseEmptyState
        v-else-if="auctions.length === 0"
        title="No lots in this category"
        description="There are no lots matching this status right now. Check back later or browse every auction."
        icon="search"
      >
        <template #action>
          <router-link to="/auctions" class="mt-5 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-heading hover:border-navy-300">
            Browse all auctions
          </router-link>
        </template>
      </BaseEmptyState>

      <template v-else>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AuctionCard v-for="auction in auctions" :key="auction.id" :auction="auction" />
        </div>

        <nav v-if="totalPages > 1" class="mt-10 flex items-center justify-between border-t border-border pt-6" aria-label="Category pagination">
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
