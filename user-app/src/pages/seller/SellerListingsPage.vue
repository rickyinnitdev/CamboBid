<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useAuth } from "@/composables/useAuth";
import { listingService } from "@/services/listingService";
import UserLayout from "@/components/layout/UserLayout.vue";
import KhmerDivider from "@/components/base/KhmerDivider.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import StatusBadge from "@/components/auction/StatusBadge.vue";
import { formatUSD } from "@/utils/format";

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
    <main class="page-container max-w-5xl">
      <KhmerDivider class="mb-6" />
      <div class="page-header">
        <div>
          <p class="kicker">Seller studio</p>
          <h1 class="page-title mt-3">{{ t("nav.my_listings") }}</h1>
          <p class="page-subtitle mt-3">
            Manage your listings, review status and keep item details current.
          </p>
        </div>
        <router-link to="/seller/listings/create" class="btn-primary btn-sm self-start sm:self-auto">
          {{ t("listing.create") }}
        </router-link>
      </div>

      <div v-if="loading" class="space-y-3">
        <BaseSkeleton v-for="i in 4" :key="i" type="card" />
      </div>

      <div
        v-else-if="error"
        role="alert"
        class="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger"
      >
        {{ error }}
        <BaseButton variant="outline" size="sm" class="ml-4" @click="loadListings">
          Retry
        </BaseButton>
      </div>

      <BaseEmptyState
        v-else-if="listings.length === 0"
        title="No listings"
        description="You haven't created any listings yet. Add your first item to start selling."
        icon="auction"
      >
        <template #action>
          <router-link to="/seller/listings/create" class="btn-primary btn-sm mt-5">
            {{ t("listing.create") }}
          </router-link>
        </template>
      </BaseEmptyState>

      <template v-else>
        <p class="mb-4 text-sm text-body">
          <strong class="font-semibold text-heading">{{ listings.length }}</strong>
          {{ listings.length === 1 ? "listing" : "listings" }}
        </p>

        <div class="space-y-3">
          <BaseCard v-for="listing in listings" :key="listing.id" hover>
            <div class="flex flex-wrap items-center gap-4 p-4">
              <div class="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface">
                <img
                  v-if="getImage(listing)"
                  :src="getImage(listing)"
                  :alt="listing.title"
                  class="h-full w-full object-cover"
                />
                <div v-else class="grid h-full w-full place-items-center">
                  <svg class="h-6 w-6 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              <div class="min-w-0 flex-1">
                <h2 class="truncate text-sm font-semibold text-heading">
                  {{ listing.title }}
                </h2>
                <p class="mt-1 text-xs text-muted">
                  {{ listing.categories?.name || "Uncategorised" }} ·
                  <span class="numeric">{{ formatUSD(listing.starting_price) }}</span>
                </p>
              </div>

              <StatusBadge :status="listing.status" type="listing" class="shrink-0" />

              <div class="flex shrink-0 items-center gap-1">
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
      </template>
    </main>
  </UserLayout>
</template>
