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
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-heading">{{ categoryName || slug }}</h1>
          <p class="text-sm text-muted mt-1">{{ total }} {{ t("common.results") }}</p>
        </div>
        <div class="w-44 mt-4 md:mt-0">
          <select
            v-model="sort"
            class="block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500"
          >
            <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
