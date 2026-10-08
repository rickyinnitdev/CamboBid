<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import UserLayout from "@/components/layout/UserLayout.vue";
import AuctionCard from "@/components/auction/AuctionCard.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { auctionService } from "@/services/auctionService";
import { searchService } from "@/services/searchService";

const { t } = useI18n();
const route = useRoute();

const auctions = ref([]);
const total = ref(0);
const loading = ref(true);
const page = ref(1);
const limit = 12;
const categoryName = ref("");
const slug = ref(route.params.slug);

const sortOptions = [
  { value: "ending_soon", label: "Ending Soon" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];
const sort = ref("ending_soon");

async function loadCategory() {
  loading.value = true;
  try {
    const [auctionResult] = await Promise.all([
      auctionService.getAuctions({ category: slug.value, sort: sort.value, page: page.value, limit }),
      searchService.getCategories(),
    ]);
    auctions.value = auctionResult.auctions;
    total.value = auctionResult.total;
    // Get category name from categories list
    const cats = await searchService.getCategories();
    const cat = cats.find((c) => c.slug === slug.value);
    categoryName.value = cat?.name || slug.value;
  } catch (err) {
    console.error("Failed to load category:", err);
  } finally {
    loading.value = false;
  }
}

function nextPage() {
  if (page.value * limit < total.value) {
    page.value++;
    loadCategory();
  }
}
function prevPage() {
  if (page.value > 1) {
    page.value--;
    loadCategory();
  }
}

onMounted(loadCategory);

watch(
  () => route.params.slug,
  (newSlug) => {
    slug.value = newSlug;
    page.value = 1;
    loadCategory();
  }
);

watch(sort, () => { page.value = 1; loadCategory(); });
</script>

<template>
  <UserLayout>
    <div class="page-container max-w-7xl">
      <div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Specialist department</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">{{ categoryName || slug }}</h1>
          <p class="mt-1 text-sm text-neutral-500">{{ total }} {{ t("common.results") }}</p>
        </div>
        <div class="mt-4 w-full md:mt-0 md:w-44">
          <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Sort</label>
          <select
            v-model="sort"
            class="block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
          >
            <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <BaseSkeleton v-for="i in 8" :key="i" type="card" />
      </div>

      <BaseEmptyState
        v-else-if="auctions.length === 0"
        title="No Auctions in This Category"
        description="Check back later or browse other categories."
        icon="search"
      >
        <template #action>
          <router-link to="/auctions" class="mt-4 inline-flex items-center px-4 py-2 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors">
            Browse All Auctions
          </router-link>
        </template>
      </BaseEmptyState>

      <template v-else>
        <div class="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AuctionCard v-for="auction in auctions" :key="auction.id" :auction="auction" />
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
