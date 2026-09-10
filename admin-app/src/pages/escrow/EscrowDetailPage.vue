<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { escrowService } from "@/services/escrowService";
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
const { canManageEscrow } = usePermission();

const escrow = ref(null);
const loading = ref(true);
const error = ref("");
const actionLoading = ref(false);
const showModal = ref(false);
const modalAction = ref("");
const modalNotes = ref("");

async function fetchEscrow() {
  loading.value = true;
  error.value = "";
  try {
    escrow.value = await escrowService.getEscrowById(route.params.id);
  } catch (e) {
    error.value = e.message || "Failed to load escrow";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchEscrow);

function openActionModal(action) {
  modalAction.value = action;
  modalNotes.value = "";
  showModal.value = true;
}

async function executeAction() {
  actionLoading.value = true;
  try {
    if (modalAction.value === "release") {
      await escrowService.releaseEscrow(route.params.id, modalNotes.value);
    } else if (modalAction.value === "refund") {
      await escrowService.refundEscrow(route.params.id, modalNotes.value);
    } else if (modalAction.value === "freeze") {
      await escrowService.freezeEscrow(route.params.id, modalNotes.value);
    }
    toast.success(`Escrow ${modalAction.value}d successfully`);
    showModal.value = false;
    await fetchEscrow();
  } catch (e) {
    toast.error(e.message || `Failed to ${modalAction.value} escrow`);
  } finally {
    actionLoading.value = false;
  }
}

function statusBadgeVariant(status) {
  const map = { pending: "warning", held: "info", released: "success", frozen: "danger", refunded: "purple" };
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
        <div>
          <h1 class="text-2xl font-bold text-heading">Escrow Details</h1>
          <p class="text-muted mt-1">Manage escrow transaction</p>
        </div>
      </div>

      <div v-if="loading" class="space-y-4">
        <BaseCard><BaseSkeleton :rows="5" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <template v-else-if="escrow">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <BaseCard>
              <div class="flex items-start justify-between mb-4">
                <h2 class="text-xl font-bold text-heading">Transaction #{{ escrow.id?.slice(0, 8) }}</h2>
                <BaseBadge :variant="statusBadgeVariant(escrow.status)">{{ escrow.status }}</BaseBadge>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p class="text-xs text-muted mb-1">Amount</p>
                  <p class="text-lg font-bold text-heading">${{ Number(escrow.amount || 0).toLocaleString() }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Listing</p>
                  <p class="text-sm font-medium text-heading">{{ escrow.auctions?.listings?.title || "N/A" }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Created</p>
                  <p class="text-sm font-medium text-heading">{{ new Date(escrow.created_at).toLocaleString() }}</p>
                </div>
                <div v-if="escrow.released_at">
                  <p class="text-xs text-muted mb-1">Released At</p>
                  <p class="text-sm font-medium text-heading">{{ new Date(escrow.released_at).toLocaleString() }}</p>
                </div>
                <div v-if="escrow.frozen_at">
                  <p class="text-xs text-muted mb-1">Frozen At</p>
                  <p class="text-sm font-medium text-heading">{{ new Date(escrow.frozen_at).toLocaleString() }}</p>
                </div>
                <div v-if="escrow.refunded_at">
                  <p class="text-xs text-muted mb-1">Refunded At</p>
                  <p class="text-sm font-medium text-heading">{{ new Date(escrow.refunded_at).toLocaleString() }}</p>
                </div>
              </div>

              <div v-if="escrow.notes" class="mt-4 pt-4 border-t border-border">
                <p class="text-xs text-muted mb-1">Notes</p>
                <p class="text-sm text-heading">{{ escrow.notes }}</p>
              </div>
            </BaseCard>

            <BaseCard>
              <h3 class="font-semibold text-heading mb-3">Parties</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p class="text-xs text-muted mb-2">Buyer</p>
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center">
                      <span class="text-xs font-semibold text-white">{{ (escrow.profiles?.display_name || "U").charAt(0).toUpperCase() }}</span>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-heading">{{ escrow.profiles?.display_name || "Unknown" }}</p>
                      <p class="text-xs text-muted">{{ escrow.profiles?.email }}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p class="text-xs text-muted mb-2">Seller</p>
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center">
                      <span class="text-xs font-semibold text-white">{{ (escrow.profiles?.display_name || "U").charAt(0).toUpperCase() }}</span>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-heading">{{ escrow.profiles?.display_name || "Unknown" }}</p>
                      <p class="text-xs text-muted">{{ escrow.profiles?.email }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>

          <div class="space-y-4">
            <BaseCard v-if="canManageEscrow && escrow.status === 'held'">
              <h3 class="font-semibold text-heading mb-4">Actions</h3>
              <div class="space-y-3">
                <BaseButton variant="success" class="w-full" @click="openActionModal('release')">
                  {{ t("escrow.release") }}
                </BaseButton>
                <BaseButton variant="danger" class="w-full" @click="openActionModal('refund')">
                  {{ t("escrow.refund") }}
                </BaseButton>
                <BaseButton variant="warning" class="w-full" @click="openActionModal('freeze')">
                  {{ t("escrow.freeze") }}
                </BaseButton>
              </div>
            </BaseCard>
          </div>
        </div>
      </template>

      <BaseModal :open="showModal" :title="`${modalAction.charAt(0).toUpperCase() + modalAction.slice(1)} Escrow`" @close="showModal = false">
        <div class="space-y-4">
          <BaseInput v-model="modalNotes" label="Notes" placeholder="Add notes for this action..." />
        </div>
        <template #footer>
          <div class="flex justify-end gap-3">
            <BaseButton variant="secondary" @click="showModal = false">{{ t("common.cancel") }}</BaseButton>
            <BaseButton :variant="modalAction === 'release' ? 'success' : modalAction === 'freeze' ? 'warning' : 'danger'" :loading="actionLoading" @click="executeAction">
              {{ t("common.confirm") }}
            </BaseButton>
          </div>
        </template>
      </BaseModal>
    </div>
  </AdminLayout>
</template>
