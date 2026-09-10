<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { auctionService } from "@/services/auctionService";
import { useToast } from "vue-toastification";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const auction = ref(null);
const loading = ref(true);
const error = ref("");
const actionLoading = ref(false);

const form = ref({
  bid_increment: 0,
  auto_extend_minutes: 0,
  max_extensions: 0,
  reserve_price: 0,
});

async function fetchAuction() {
  loading.value = true;
  error.value = "";
  try {
    auction.value = await auctionService.getAuctionById(route.params.id);
    form.value = {
      bid_increment: auction.value.bid_increment || 0,
      auto_extend_minutes: auction.value.auto_extend_minutes || 0,
      max_extensions: auction.value.max_extensions || 0,
      reserve_price: auction.value.reserve_price || 0,
    };
  } catch (e) {
    error.value = e.message || "Failed to load auction";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchAuction);

async function saveSettings() {
  actionLoading.value = true;
  try {
    auction.value = await auctionService.updateAuctionSettings(route.params.id, form.value);
    toast.success("Settings saved");
  } catch (e) {
    toast.error(e.message || "Failed to save settings");
  } finally {
    actionLoading.value = false;
  }
}

async function closeAuction() {
  actionLoading.value = true;
  try {
    await auctionService.closeAuction(route.params.id, "Closed by admin");
    toast.success("Auction closed");
    await fetchAuction();
  } catch (e) {
    toast.error(e.message || "Failed to close auction");
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
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-heading">Auction Settings</h1>
          <p class="text-muted mt-1">{{ auction?.listings?.title || "Loading..." }}</p>
        </div>
      </div>

      <div v-if="loading" class="space-y-4">
        <BaseCard><BaseSkeleton :rows="5" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <template v-else-if="auction">
        <BaseCard>
          <h3 class="font-semibold text-heading mb-4">Auction Parameters</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BaseInput v-model.number="form.bid_increment" label="Bid Increment ($)" type="number" />
            <BaseInput v-model.number="form.auto_extend_minutes" label="Auto Extend (minutes)" type="number" />
            <BaseInput v-model.number="form.max_extensions" label="Max Extensions" type="number" />
            <BaseInput v-model.number="form.reserve_price" label="Reserve Price ($)" type="number" />
          </div>
          <div class="flex gap-3 mt-6">
            <BaseButton :loading="actionLoading" @click="saveSettings">{{ t("common.save") }}</BaseButton>
            <BaseButton variant="danger" :disabled="auction.status === 'closed'" :loading="actionLoading" @click="closeAuction">
              Close Auction
            </BaseButton>
          </div>
        </BaseCard>

        <BaseCard>
          <h3 class="font-semibold text-heading mb-4">Current Status</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p class="text-xs text-muted mb-1">Status</p>
              <p class="text-sm font-medium text-heading capitalize">{{ auction.status }}</p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1">Current Price</p>
              <p class="text-sm font-medium text-heading">${{ Number(auction.current_price || 0).toLocaleString() }}</p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1">End Time</p>
              <p class="text-sm font-medium text-heading">{{ auction.end_time ? new Date(auction.end_time).toLocaleString() : "N/A" }}</p>
            </div>
            <div>
              <p class="text-xs text-muted mb-1">Type</p>
              <p class="text-sm font-medium text-heading">{{ auction.type }}</p>
            </div>
          </div>
        </BaseCard>
      </template>
    </div>
  </AdminLayout>
</template>
