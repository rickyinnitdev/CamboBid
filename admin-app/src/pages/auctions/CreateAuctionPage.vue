<script setup>
import ListingImage from "@/components/base/ListingImage.vue";
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { auctionService } from "@/services/auctionService";
import { useToast } from "vue-toastification";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const approvedListings = ref([]);
const loading = ref(true);
const error = ref("");
const actionLoading = ref(false);

const form = ref({
  listing_id: "",
  type: "english",
  starting_price: 0,
  reserve_price: 0,
  bid_increment: 0.01,
  duration_minutes: 5,
  payment_mode: "demo",
  auto_extend_minutes: 5,
  max_extensions: 3,
});

async function fetchListings() {
  loading.value = true;
  error.value = "";
  try {
    approvedListings.value = await auctionService.getApprovedListings();
    const selected = approvedListings.value.find(
      (item) => item.id === route.query.listing,
    );
    if (selected) selectListing(selected);
  } catch (e) {
    error.value = e.message || "Failed to load listings";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchListings);

function selectListing(listing) {
  form.value.listing_id = listing.id;
  form.value.starting_price = listing.starting_price || 0.01;
  form.value.reserve_price = listing.reserve_price ?? 0;
}

async function createAuction() {
  if (!form.value.listing_id) {
    toast.error("Please select a listing");
    return;
  }
  actionLoading.value = true;
  try {
    await auctionService.createAuction({
      ...form.value,
    });
    toast.success("Auction created successfully");
    router.push("/admin/auctions");
  } catch (e) {
    toast.error(e.message || "Failed to create auction");
  } finally {
    actionLoading.value = false;
  }
}
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center gap-4">
        <button class="text-muted hover:text-heading" @click="router.back()">
          <svg
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <div>
          <h1 class="text-2xl font-bold text-heading">Create Auction</h1>
          <p class="text-muted mt-1">
            Create a new auction from an approved listing
          </p>
        </div>
      </div>

      <div v-if="loading" class="space-y-4">
        <BaseSkeleton :rows="4" />
      </div>

      <div
        v-else-if="error"
        class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
      >
        {{ error }}
      </div>

      <template v-else>
        <BaseCard v-if="approvedListings.length === 0">
          <BaseEmptyState
            title="No approved listings"
            description="All listings must be approved before creating auctions"
          />
        </BaseCard>

        <template v-else>
          <BaseCard>
            <h3 class="font-semibold text-heading mb-4">Select Listing</h3>
            <div
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto"
            >
              <button
                v-for="listing in approvedListings"
                :key="listing.id"
                :class="[
                  'p-3 rounded-lg border text-left transition-colors',
                  form.listing_id === listing.id
                    ? 'border-navy-500 bg-navy-50'
                    : 'border-border hover:border-navy-300',
                ]"
                @click="selectListing(listing)"
              >
                <ListingImage
                  :image="listing.images?.[0]"
                  :alt="listing.title"
                  class="w-16 h-16 mb-3"
                />
                <p class="font-medium text-heading text-sm">
                  {{ listing.title }}
                </p>
                <p class="text-xs text-muted mt-1">
                  ${{ Number(listing.starting_price || 0).toLocaleString() }}
                </p>
              </button>
            </div>
          </BaseCard>

          <BaseCard v-if="form.listing_id">
            <h3 class="font-semibold text-heading mb-4">Auction Settings</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BaseInput
                v-model="form.type"
                label="Type (English auction)"
                disabled
              />
              <BaseInput
                v-model.number="form.starting_price"
                label="Starting Price"
                type="number"
              />
              <BaseInput
                v-model.number="form.reserve_price"
                label="Reserve Price"
                type="number"
              />
              <BaseInput
                v-model.number="form.bid_increment"
                label="Bid Increment"
                type="number"
              />
              <BaseInput
                v-model.number="form.duration_minutes"
                label="Duration (minutes, 2–10080)"
                type="number"
              />
              <BaseInput
                v-model.number="form.auto_extend_minutes"
                label="Auto Extend (min)"
                type="number"
              />
              <BaseInput
                v-model.number="form.max_extensions"
                label="Max Extensions"
                type="number"
              />
            </div>
            <label class="block text-sm mt-5"
              >Payment environment
              <select
                v-model="form.payment_mode"
                class="block mt-2 p-3 border rounded-xl w-full"
              >
                <option value="demo">Demo wallet funds</option>
                <option value="live">Real KHQR wallet funds</option>
              </select>
            </label>
            <p class="text-sm text-slate-500 mt-3">
              Creating the auction starts it immediately. Live bidding status
              and real payment mode are separate. Enable real KHQR in
              Integrations before choosing real funds. The seller cannot bid on
              their own item.
            </p>
            <p class="text-xs text-slate-500 mt-3">
              A bid in the last 20 seconds adds the configured extension, up to
              Max Extensions. Use 0 extensions for a fixed end time.
            </p>
            <div class="mt-6">
              <BaseButton :loading="actionLoading" @click="createAuction"
                >Create Auction</BaseButton
              >
            </div>
          </BaseCard>
        </template>
      </template>
    </div>
  </AdminLayout>
</template>
