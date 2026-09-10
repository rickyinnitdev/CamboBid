<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useAuth } from "@/composables/useAuth";
import { listingService } from "@/services/listingService";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import StatusBadge from "@/components/auction/StatusBadge.vue";

const { t } = useI18n();
const { user } = useAuth();

const listings = ref([]);
const loading = ref(true);
const error = ref("");
const deleting = ref(null);

async function loadListings() {
  if (!user.value) return;
  loading.value = true;
  try {
    listings.value = await listingService.getSellerListings(user.value.id);
  } catch (err) {
    error.value = err.message || "Failed to load listings.";
  } finally {
    loading.value = false;
  }
}

async function handleDelete(id) {
  if (!confirm("Are you sure you want to delete this listing?")) return;
  deleting.value = id;
  try {
    await listingService.deleteListing(id);
    listings.value = listings.value.filter((l) => l.id !== id);
  } catch (err) {
    alert(err.message || "Failed to delete listing.");
  } finally {
    deleting.value = null;
  }
}

onMounted(loadListings);

function getImage(listing) {
  const images = listing.images;
  if (Array.isArray(images) && images.length > 0) {
    return typeof images[0] === "string" ? images[0] : images[0]?.url;
  }
  return null;
}
</script>

<template>
  <UserLayout>
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-heading">{{ t("nav.my_listings") }}</h1>
          <p class="text-sm text-muted mt-1">{{ listings.length }} {{ t("common.results") }}</p>
        </div>
        <router-link to="/seller/listings/create">
          <BaseButton variant="primary" size="sm">{{ t("listing.create") }}</BaseButton>
        </router-link>
      </div>

      <div v-if="loading" class="space-y-4">
        <BaseSkeleton v-for="i in 4" :key="i" type="card" />
      </div>

      <div v-else-if="error" class="p-4 rounded-lg bg-danger/10 text-danger text-sm">
        {{ error }}
        <BaseButton variant="outline" size="sm" class="ml-4" @click="loadListings">Retry</BaseButton>
      </div>

      <BaseEmptyState
        v-else-if="listings.length === 0"
        title="No Listings"
        description="You haven't created any listings yet."
        icon="auction"
      >
        <template #action>
          <router-link to="/seller/listings/create" class="mt-4 inline-flex items-center px-4 py-2 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors">
            {{ t("listing.create") }}
          </router-link>
        </template>
      </BaseEmptyState>

      <div v-else class="space-y-4">
        <BaseCard v-for="listing in listings" :key="listing.id">
          <div class="flex items-center gap-4 p-4">
            <div class="w-16 h-16 rounded-lg bg-surface overflow-hidden flex-shrink-0">
              <img v-if="getImage(listing)" :src="getImage(listing)" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-6 h-6 text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-heading truncate">{{ listing.title }}</h3>
              <p class="text-xs text-muted mt-0.5">
                {{ listing.categories?.name }} • ${{ Number(listing.starting_price).toLocaleString() }}
              </p>
            </div>
            <StatusBadge :status="listing.status" type="listing" class="flex-shrink-0" />
            <div class="flex items-center gap-2 flex-shrink-0">
              <router-link :to="`/seller/listings/${listing.id}/edit`">
                <BaseButton variant="ghost" size="sm">{{ t("common.edit") }}</BaseButton>
              </router-link>
              <BaseButton
                variant="ghost"
                size="sm"
                :disabled="deleting === listing.id"
                @click="handleDelete(listing.id)"
              >
                <span class="text-danger">{{ t("common.delete") }}</span>
              </BaseButton>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </UserLayout>
</template>
