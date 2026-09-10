<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { disputeService } from "@/services/disputeService";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import StatusBadge from "@/components/auction/StatusBadge.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const dispute = ref(null);
const loading = ref(true);
const error = ref("");
const addingEvidence = ref(false);
const evidenceFiles = ref([]);

onMounted(async () => {
  try {
    dispute.value = await disputeService.getDisputeById(route.params.id);
  } catch (err) {
    error.value = err.message || "Failed to load dispute.";
  } finally {
    loading.value = false;
  }
});

function handleEvidenceChange(e) {
  evidenceFiles.value = Array.from(e.target.files || []);
}

async function handleAddEvidence() {
  if (!evidenceFiles.value.length) return;
  addingEvidence.value = true;
  try {
    await disputeService.addEvidence(dispute.value.id, evidenceFiles.value);
    dispute.value = await disputeService.getDisputeById(route.params.id);
    evidenceFiles.value = [];
  } catch (err) {
    error.value = err.message || "Failed to add evidence.";
  } finally {
    addingEvidence.value = false;
  }
}

async function handleAppeal() {
  if (!confirm("Are you sure you want to appeal this dispute?")) return;
  try {
    await disputeService.appealDispute(dispute.value.id);
    dispute.value = await disputeService.getDisputeById(route.params.id);
  } catch (err) {
    error.value = err.message || "Failed to appeal.";
  }
}

function getImage() {
  const images = dispute.value?.auctions?.listings?.images;
  if (Array.isArray(images) && images.length > 0) {
    return typeof images[0] === "string" ? images[0] : images[0]?.url;
  }
  return null;
}
</script>

<template>
  <UserLayout>
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="mb-6">
        <button @click="router.back()" class="text-sm text-muted hover:text-heading transition-colors">&larr; {{ t("common.back") }}</button>
      </div>

      <div v-if="loading" class="space-y-4">
        <BaseSkeleton type="card" />
      </div>

      <div v-else-if="error" class="p-4 rounded-lg bg-danger/10 text-danger text-sm">{{ error }}</div>

      <template v-else-if="dispute">
        <h1 class="text-2xl font-bold text-heading mb-6">Dispute Details</h1>

        <div class="space-y-6">
          <!-- Summary -->
          <BaseCard>
            <div class="p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex gap-4">
                  <div class="w-16 h-16 rounded-lg bg-surface overflow-hidden flex-shrink-0">
                    <img v-if="getImage()" :src="getImage()" class="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h2 class="font-semibold text-heading">{{ dispute.auctions?.listings?.title }}</h2>
                    <p class="text-sm text-muted mt-0.5">${{ Number(dispute.auctions?.current_price).toLocaleString() }}</p>
                  </div>
                </div>
                <StatusBadge :status="dispute.status" type="dispute" />
              </div>

              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted">Reason</span>
                  <span class="text-heading font-medium">{{ dispute.reason }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted">Filed</span>
                  <span class="text-heading">{{ new Date(dispute.created_at).toLocaleString() }}</span>
                </div>
                <div v-if="dispute.resolved_at" class="flex justify-between">
                  <span class="text-muted">Resolved</span>
                  <span class="text-heading">{{ new Date(dispute.resolved_at).toLocaleString() }}</span>
                </div>
                <div v-if="dispute.appeal_deadline" class="flex justify-between">
                  <span class="text-muted">{{ t("dispute.appeal_deadline") }}</span>
                  <span class="text-heading">{{ new Date(dispute.appeal_deadline).toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </BaseCard>

          <!-- Description -->
          <BaseCard v-if="dispute.description">
            <div class="p-6">
              <h3 class="font-semibold text-heading mb-2">Description</h3>
              <p class="text-sm text-body whitespace-pre-wrap">{{ dispute.description }}</p>
            </div>
          </BaseCard>

          <!-- Resolution -->
          <BaseCard v-if="dispute.resolution">
            <div class="p-6">
              <h3 class="font-semibold text-heading mb-2">Resolution</h3>
              <p class="text-sm text-body whitespace-pre-wrap">{{ dispute.resolution }}</p>
            </div>
          </BaseCard>

          <!-- Evidence -->
          <BaseCard>
            <div class="p-6">
              <h3 class="font-semibold text-heading mb-3">{{ t("dispute.evidence") }}</h3>
              <div v-if="dispute.evidence?.length" class="flex flex-wrap gap-3">
                <div v-for="(ev, i) in dispute.evidence" :key="i" class="w-20 h-20 rounded-lg border border-border overflow-hidden">
                  <img :src="ev.url" class="w-full h-full object-cover" />
                </div>
              </div>
              <p v-else class="text-sm text-muted">No evidence uploaded yet.</p>

              <div class="mt-4">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  class="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-navy-700 file:text-white hover:file:bg-navy-800 file:cursor-pointer"
                  @change="handleEvidenceChange"
                />
                <BaseButton
                  v-if="evidenceFiles.length"
                  variant="primary"
                  size="sm"
                  :loading="addingEvidence"
                  class="mt-2"
                  @click="handleAddEvidence"
                >
                  {{ t("dispute.add_evidence") }}
                </BaseButton>
              </div>
            </div>
          </BaseCard>

          <!-- Appeal -->
          <BaseCard v-if="dispute.status === 'resolved'">
            <div class="p-6">
              <h3 class="font-semibold text-heading mb-2">Appeal</h3>
              <p class="text-sm text-muted mb-4">If you disagree with the resolution, you can appeal within the deadline.</p>
              <BaseButton variant="outline" @click="handleAppeal">
                {{ t("dispute.appeal_deadline") }}
              </BaseButton>
            </div>
          </BaseCard>
        </div>
      </template>
    </div>
  </UserLayout>
</template>
