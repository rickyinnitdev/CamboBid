<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { listingService } from "@/services/listingService";
import { useAuth } from "@/composables/useAuth";
import { usePermission } from "@/composables/usePermission";
import { useToast } from "vue-toastification";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseBadge from "@/components/base/BaseBadge.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const { user } = useAuth();
const { canApproveListings } = usePermission();

const listing = ref(null);
const loading = ref(true);
const error = ref("");
const actionLoading = ref(false);
const showRejectModal = ref(false);
const rejectReason = ref("");

async function fetchListing() {
  loading.value = true;
  error.value = "";
  try {
    listing.value = await listingService.getListingById(route.params.id);
  } catch (e) {
    error.value = e.message || "Failed to load listing";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchListing);

async function approveListing() {
  actionLoading.value = true;
  try {
    listing.value = await listingService.approveListing(route.params.id, user.value.id);
    toast.success("Listing approved");
  } catch (e) {
    toast.error(e.message || "Failed to approve listing");
  } finally {
    actionLoading.value = false;
  }
}

async function rejectListing() {
  if (!rejectReason.value.trim()) return;
  actionLoading.value = true;
  try {
    listing.value = await listingService.rejectListing(route.params.id, user.value.id, rejectReason.value);
    showRejectModal.value = false;
    rejectReason.value = "";
    toast.success("Listing rejected");
  } catch (e) {
    toast.error(e.message || "Failed to reject listing");
  } finally {
    actionLoading.value = false;
  }
}

function statusBadgeVariant(status) {
  const map = { pending: "warning", approved: "success", rejected: "danger", live: "info", sold: "purple" };
  return map[status] || "default";
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
          <h1 class="text-2xl font-bold text-heading">Listing Details</h1>
          <p class="text-muted mt-1">Review and manage listing</p>
        </div>
      </div>

      <div v-if="loading" class="space-y-4">
        <BaseCard><BaseSkeleton :rows="5" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <template v-else-if="listing">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <BaseCard>
              <div class="flex items-start justify-between mb-4">
                <h2 class="text-xl font-bold text-heading">{{ listing.title }}</h2>
                <BaseBadge :variant="statusBadgeVariant(listing.status)">{{ listing.status }}</BaseBadge>
              </div>
              <p class="text-sm text-muted mb-4">{{ listing.description }}</p>

              <div v-if="listing.images?.length" class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <div v-for="(img, i) in listing.images" :key="i" class="aspect-square rounded-lg bg-surface overflow-hidden">
                  <img :src="img" class="w-full h-full object-cover" />
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
                <div>
                  <p class="text-xs text-muted mb-1">Starting Price</p>
                  <p class="text-sm font-medium text-heading">${{ Number(listing.starting_price || 0).toLocaleString() }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Reserve Price</p>
                  <p class="text-sm font-medium text-heading">${{ Number(listing.reserve_price || 0).toLocaleString() }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Category</p>
                  <p class="text-sm font-medium text-heading">{{ listing.categories?.name || "N/A" }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Condition</p>
                  <p class="text-sm font-medium text-heading capitalize">{{ listing.condition?.replace("_", " ") }}</p>
                </div>
              </div>
            </BaseCard>

            <BaseCard>
              <h3 class="font-semibold text-heading mb-3">Seller</h3>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-navy-700 flex items-center justify-center">
                  <span class="text-sm font-semibold text-white">{{ (listing.profiles?.display_name || "U").charAt(0).toUpperCase() }}</span>
                </div>
                <div>
                  <p class="font-medium text-heading">{{ listing.profiles?.display_name || "Unknown" }}</p>
                  <p class="text-xs text-muted">Reputation: {{ listing.profiles?.reputation_score || 0 }}</p>
                </div>
              </div>
            </BaseCard>
          </div>

          <div class="space-y-4">
            <BaseCard v-if="canApproveListings && listing.status === 'pending'">
              <h3 class="font-semibold text-heading mb-4">Approval Actions</h3>
              <div class="space-y-3">
                <BaseButton variant="success" class="w-full" :loading="actionLoading" @click="approveListing">
                  {{ t("admin.approve") }}
                </BaseButton>
                <BaseButton variant="danger" class="w-full" @click="showRejectModal = true">
                  {{ t("admin.reject") }}
                </BaseButton>
              </div>
            </BaseCard>

            <BaseCard v-if="listing.rejection_reason">
              <h3 class="font-semibold text-heading mb-2">Rejection Reason</h3>
              <p class="text-sm text-muted">{{ listing.rejection_reason }}</p>
            </BaseCard>
          </div>
        </div>
      </template>

      <BaseModal :open="showRejectModal" title="Reject Listing" @close="showRejectModal = false">
        <div class="space-y-4">
          <BaseInput v-model="rejectReason" label="Reason for rejection" placeholder="Enter reason..." required />
        </div>
        <template #footer>
          <div class="flex justify-end gap-3">
            <BaseButton variant="secondary" @click="showRejectModal = false">{{ t("common.cancel") }}</BaseButton>
            <BaseButton variant="danger" :loading="actionLoading" @click="rejectListing">{{ t("admin.reject") }}</BaseButton>
          </div>
        </template>
      </BaseModal>
    </div>
  </AdminLayout>
</template>
