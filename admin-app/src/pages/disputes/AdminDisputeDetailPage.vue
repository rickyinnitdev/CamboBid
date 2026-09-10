<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { disputeService } from "@/services/disputeService";
import { userService } from "@/services/userService";
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
const { canManageDisputes } = usePermission();

const dispute = ref(null);
const loading = ref(true);
const error = ref("");
const actionLoading = ref(false);
const arbitrators = ref([]);
const showAssignModal = ref(false);
const selectedArbitrator = ref("");
const showResolveModal = ref(false);
const resolution = ref("");

async function fetchDispute() {
  loading.value = true;
  error.value = "";
  try {
    dispute.value = await disputeService.getDisputeById(route.params.id);
  } catch (e) {
    error.value = e.message || "Failed to load dispute";
  } finally {
    loading.value = false;
  }
}

async function fetchArbitrators() {
  try {
    const result = await userService.getUsers({ role: "auctioneer", limit: 100 });
    arbitrators.value = result.users;
  } catch (e) {
    console.error("Failed to load arbitrators:", e);
  }
}

onMounted(() => {
  fetchDispute();
  fetchArbitrators();
});

async function assignArbitrator() {
  if (!selectedArbitrator.value) return;
  actionLoading.value = true;
  try {
    await disputeService.assignArbitrator(route.params.id, selectedArbitrator.value);
    toast.success("Arbitrator assigned");
    showAssignModal.value = false;
    await fetchDispute();
  } catch (e) {
    toast.error(e.message || "Failed to assign arbitrator");
  } finally {
    actionLoading.value = false;
  }
}

async function resolveDispute() {
  if (!resolution.value.trim()) return;
  actionLoading.value = true;
  try {
    await disputeService.resolveDispute(route.params.id, resolution.value, user.value.id);
    toast.success("Dispute resolved");
    showResolveModal.value = false;
    resolution.value = "";
    await fetchDispute();
  } catch (e) {
    toast.error(e.message || "Failed to resolve dispute");
  } finally {
    actionLoading.value = false;
  }
}

function statusBadgeVariant(status) {
  const map = { open: "warning", under_review: "info", resolved: "success", appealed: "danger", closed: "default" };
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
          <h1 class="text-2xl font-bold text-heading">Dispute Details</h1>
          <p class="text-muted mt-1">Review and resolve dispute</p>
        </div>
      </div>

      <div v-if="loading" class="space-y-4">
        <BaseCard><BaseSkeleton :rows="5" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <template v-else-if="dispute">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <BaseCard>
              <div class="flex items-start justify-between mb-4">
                <h2 class="text-xl font-bold text-heading">{{ dispute.reason }}</h2>
                <BaseBadge :variant="statusBadgeVariant(dispute.status)">{{ dispute.status?.replace("_", " ") }}</BaseBadge>
              </div>
              <p class="text-sm text-muted mb-4">{{ dispute.description }}</p>

              <div class="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p class="text-xs text-muted mb-1">Auction</p>
                  <p class="text-sm font-medium text-heading">{{ dispute.auctions?.listings?.title || "N/A" }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Amount</p>
                  <p class="text-sm font-medium text-heading">${{ Number(dispute.auctions?.current_price || 0).toLocaleString() }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Filed</p>
                  <p class="text-sm font-medium text-heading">{{ new Date(dispute.created_at).toLocaleString() }}</p>
                </div>
                <div v-if="dispute.appeal_deadline">
                  <p class="text-xs text-muted mb-1">Appeal Deadline</p>
                  <p class="text-sm font-medium text-heading">{{ new Date(dispute.appeal_deadline).toLocaleString() }}</p>
                </div>
              </div>
            </BaseCard>

            <BaseCard v-if="dispute.evidence?.length">
              <h3 class="font-semibold text-heading mb-3">Evidence</h3>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div v-for="(evidence, i) in dispute.evidence" :key="i" class="aspect-square rounded-lg bg-surface overflow-hidden">
                  <img :src="evidence" class="w-full h-full object-cover" />
                </div>
              </div>
            </BaseCard>

            <BaseCard v-if="dispute.resolution">
              <h3 class="font-semibold text-heading mb-2">Resolution</h3>
              <p class="text-sm text-muted">{{ dispute.resolution }}</p>
              <p v-if="dispute.resolved_at" class="text-xs text-muted mt-2">Resolved at {{ new Date(dispute.resolved_at).toLocaleString() }}</p>
            </BaseCard>
          </div>

          <div class="space-y-4">
            <BaseCard>
              <h3 class="font-semibold text-heading mb-3">Parties</h3>
              <div class="space-y-3">
                <div>
                  <p class="text-xs text-muted mb-1">Filed By</p>
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-navy-700 flex items-center justify-center">
                      <span class="text-xs font-semibold text-white">{{ (dispute.profiles?.display_name || "U").charAt(0).toUpperCase() }}</span>
                    </div>
                    <span class="text-sm text-heading">{{ dispute.profiles?.display_name || "Unknown" }}</span>
                  </div>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Against</p>
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-navy-700 flex items-center justify-center">
                      <span class="text-xs font-semibold text-white">{{ (dispute.profiles?.display_name || "U").charAt(0).toUpperCase() }}</span>
                    </div>
                    <span class="text-sm text-heading">{{ dispute.profiles?.display_name || "Unknown" }}</span>
                  </div>
                </div>
                <div v-if="dispute.profiles?.display_name">
                  <p class="text-xs text-muted mb-1">Arbitrator</p>
                  <p class="text-sm text-heading">{{ dispute.profiles?.display_name || "Not assigned" }}</p>
                </div>
              </div>
            </BaseCard>

            <BaseCard v-if="canManageDisputes && dispute.status === 'open'">
              <h3 class="font-semibold text-heading mb-4">Actions</h3>
              <div class="space-y-3">
                <BaseButton class="w-full" @click="showAssignModal = true">Assign Arbitrator</BaseButton>
              </div>
            </BaseCard>

            <BaseCard v-if="canManageDisputes && dispute.status === 'under_review'">
              <h3 class="font-semibold text-heading mb-4">Resolution</h3>
              <BaseButton variant="success" class="w-full" @click="showResolveModal = true">Resolve Dispute</BaseButton>
            </BaseCard>
          </div>
        </div>
      </template>

      <BaseModal :open="showAssignModal" title="Assign Arbitrator" @close="showAssignModal = false">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-heading mb-1">Select Arbitrator</label>
            <select v-model="selectedArbitrator" class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500">
              <option value="">Select...</option>
              <option v-for="arb in arbitrators" :key="arb.id" :value="arb.id">{{ arb.display_name }}</option>
            </select>
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-3">
            <BaseButton variant="secondary" @click="showAssignModal = false">{{ t("common.cancel") }}</BaseButton>
            <BaseButton :loading="actionLoading" @click="assignArbitrator">{{ t("common.confirm") }}</BaseButton>
          </div>
        </template>
      </BaseModal>

      <BaseModal :open="showResolveModal" title="Resolve Dispute" @close="showResolveModal = false">
        <div class="space-y-4">
          <BaseInput v-model="resolution" label="Resolution Details" placeholder="Describe the resolution..." required />
        </div>
        <template #footer>
          <div class="flex justify-end gap-3">
            <BaseButton variant="secondary" @click="showResolveModal = false">{{ t("common.cancel") }}</BaseButton>
            <BaseButton variant="success" :loading="actionLoading" @click="resolveDispute">{{ t("common.confirm") }}</BaseButton>
          </div>
        </template>
      </BaseModal>
    </div>
  </AdminLayout>
</template>
