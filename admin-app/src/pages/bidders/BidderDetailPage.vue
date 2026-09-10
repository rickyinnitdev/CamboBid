<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { userService } from "@/services/userService";
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
const { canManageUsers } = usePermission();

const bidder = ref(null);
const loading = ref(true);
const error = ref("");
const showSuspendModal = ref(false);
const suspendReason = ref("");
const actionLoading = ref(false);

async function fetchBidder() {
  loading.value = true;
  error.value = "";
  try {
    bidder.value = await userService.getUserById(route.params.id);
  } catch (e) {
    error.value = e.message || "Failed to load bidder";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchBidder);

async function verifyIdentity() {
  actionLoading.value = true;
  try {
    bidder.value = await userService.verifyIdentity(route.params.id);
    toast.success("Identity verified successfully");
  } catch (e) {
    toast.error(e.message || "Failed to verify identity");
  } finally {
    actionLoading.value = false;
  }
}

async function suspendUser() {
  actionLoading.value = true;
  try {
    bidder.value = await userService.suspendUser(route.params.id, suspendReason.value);
    showSuspendModal.value = false;
    suspendReason.value = "";
    toast.success("User suspended");
  } catch (e) {
    toast.error(e.message || "Failed to suspend user");
  } finally {
    actionLoading.value = false;
  }
}

async function unsuspendUser() {
  actionLoading.value = true;
  try {
    bidder.value = await userService.unsuspendUser(route.params.id);
    toast.success("User unsuspended");
  } catch (e) {
    toast.error(e.message || "Failed to unsuspend user");
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
        <div>
          <h1 class="text-2xl font-bold text-heading">Bidder Details</h1>
          <p class="text-muted mt-1">View and manage bidder account</p>
        </div>
      </div>

      <div v-if="loading" class="space-y-4">
        <BaseCard><BaseSkeleton type="avatar" :rows="3" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <template v-else-if="bidder">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <BaseCard>
              <div class="flex items-center gap-4 mb-6">
                <div class="w-16 h-16 rounded-full bg-navy-700 flex items-center justify-center">
                  <span class="text-xl font-bold text-white">{{ (bidder.display_name || "U").charAt(0).toUpperCase() }}</span>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-heading">{{ bidder.display_name || "Unnamed" }}</h2>
                  <p class="text-muted">{{ bidder.email }}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-xs text-muted mb-1">Role</p>
                  <BaseBadge variant="info">{{ bidder.role?.replace("_", " ") }}</BaseBadge>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Status</p>
                  <BaseBadge :variant="bidder.suspended ? 'danger' : 'success'">
                    {{ bidder.suspended ? 'Suspended' : 'Active' }}
                  </BaseBadge>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Identity</p>
                  <BaseBadge :variant="bidder.identity_verified ? 'success' : 'warning'">
                    {{ bidder.identity_verified ? 'Verified' : 'Pending' }}
                  </BaseBadge>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Deposit</p>
                  <BaseBadge :variant="bidder.deposit_paid ? 'success' : 'warning'">
                    {{ bidder.deposit_paid ? 'Paid' : 'Unpaid' }}
                  </BaseBadge>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Bid Limit</p>
                  <p class="text-sm font-medium text-heading">{{ bidder.bid_limit || "No limit" }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Reputation</p>
                  <p class="text-sm font-medium text-heading">{{ bidder.reputation_score || 0 }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Joined</p>
                  <p class="text-sm font-medium text-heading">{{ new Date(bidder.created_at).toLocaleDateString() }}</p>
                </div>
              </div>
            </BaseCard>
          </div>

          <div class="space-y-4">
            <BaseCard>
              <h3 class="font-semibold text-heading mb-4">Actions</h3>
              <div class="space-y-3">
                <BaseButton
                  v-if="canManageUsers && !bidder.identity_verified"
                  variant="success"
                  class="w-full"
                  :loading="actionLoading"
                  @click="verifyIdentity"
                >
                  {{ t("admin.verify") }} Identity
                </BaseButton>
                <BaseButton
                  v-if="canManageUsers && !bidder.suspended"
                  variant="danger"
                  class="w-full"
                  @click="showSuspendModal = true"
                >
                  {{ t("admin.suspend") }} User
                </BaseButton>
                <BaseButton
                  v-if="canManageUsers && bidder.suspended"
                  variant="success"
                  class="w-full"
                  :loading="actionLoading"
                  @click="unsuspendUser"
                >
                  {{ t("admin.unsuspend") }} User
                </BaseButton>
              </div>
            </BaseCard>
          </div>
        </div>
      </template>

      <BaseModal :open="showSuspendModal" title="Suspend User" @close="showSuspendModal = false">
        <div class="space-y-4">
          <BaseInput v-model="suspendReason" label="Reason for suspension" placeholder="Enter reason..." required />
        </div>
        <template #footer>
          <div class="flex justify-end gap-3">
            <BaseButton variant="secondary" @click="showSuspendModal = false">{{ t("common.cancel") }}</BaseButton>
            <BaseButton variant="danger" :loading="actionLoading" @click="suspendUser">{{ t("admin.suspend") }}</BaseButton>
          </div>
        </template>
      </BaseModal>
    </div>
  </AdminLayout>
</template>
