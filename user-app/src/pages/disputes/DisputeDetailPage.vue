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
import { formatDateTime, formatUSD } from "@/utils/format";

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
    <main class="page-container max-w-4xl">
      <button
        class="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-body transition-colors hover:text-heading"
        @click="router.back()"
      >
        &larr; {{ t("common.back") }}
      </button>

      <div v-if="loading" class="space-y-4">
        <BaseSkeleton type="card" />
      </div>

      <div
        v-else-if="error"
        role="alert"
        class="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger"
      >
        {{ error }}
      </div>

      <template v-else-if="dispute">
        <div class="page-header">
          <div>
            <p class="kicker">Dispute</p>
            <h1 class="page-title mt-3">Dispute details</h1>
            <p class="mt-2 text-sm text-muted">
              Filed {{ formatDateTime(dispute.created_at) }}
            </p>
          </div>
          <StatusBadge :status="dispute.status" type="dispute" class="self-start sm:self-auto" />
        </div>

        <div class="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div class="space-y-5">
            <BaseCard padded>
              <div class="flex flex-wrap items-start gap-4">
                <div class="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface">
                  <img
                    v-if="getImage()"
                    :src="getImage()"
                    :alt="dispute.auctions?.listings?.title"
                    class="h-full w-full object-cover"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <h2 class="font-display text-base font-semibold text-heading">
                    {{ dispute.auctions?.listings?.title }}
                  </h2>
                  <p class="numeric mt-1 text-sm text-body">
                    {{ formatUSD(dispute.auctions?.current_price) }}
                  </p>
                </div>
              </div>

              <dl class="mt-5 space-y-3 border-t border-border pt-4 text-sm">
                <div class="flex items-start justify-between gap-4">
                  <dt class="text-body">Reason</dt>
                  <dd class="text-right font-medium text-heading">{{ dispute.reason }}</dd>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <dt class="text-body">Filed</dt>
                  <dd class="text-right text-heading">{{ formatDateTime(dispute.created_at) }}</dd>
                </div>
                <div v-if="dispute.resolved_at" class="flex items-start justify-between gap-4">
                  <dt class="text-body">Resolved</dt>
                  <dd class="text-right text-heading">{{ formatDateTime(dispute.resolved_at) }}</dd>
                </div>
                <div v-if="dispute.appeal_deadline" class="flex items-start justify-between gap-4">
                  <dt class="text-body">{{ t("dispute.appeal_deadline") }}</dt>
                  <dd class="text-right text-heading">{{ formatDateTime(dispute.appeal_deadline) }}</dd>
                </div>
              </dl>
            </BaseCard>

            <BaseCard v-if="dispute.description" padded>
              <h3 class="font-display text-base font-semibold text-heading">Description</h3>
              <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-body">
                {{ dispute.description }}
              </p>
            </BaseCard>

            <BaseCard v-if="dispute.resolution" padded>
              <h3 class="font-display text-base font-semibold text-heading">Resolution</h3>
              <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-body">
                {{ dispute.resolution }}
              </p>
            </BaseCard>

            <BaseCard padded>
              <h3 class="font-display text-base font-semibold text-heading">
                {{ t("dispute.evidence") }}
              </h3>
              <div v-if="dispute.evidence?.length" class="mt-4 flex flex-wrap gap-3">
                <div
                  v-for="(ev, i) in dispute.evidence"
                  :key="i"
                  class="h-20 w-20 overflow-hidden rounded-lg border border-border"
                >
                  <img :src="ev.url" alt="Dispute evidence" class="h-full w-full object-cover" />
                </div>
              </div>
              <p v-else class="mt-3 text-sm text-muted">No evidence uploaded yet.</p>

              <div class="mt-5 border-t border-border pt-4">
                <label for="dispute-evidence" class="label">Add evidence</label>
                <input
                  id="dispute-evidence"
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  class="block w-full cursor-pointer rounded-lg border border-line bg-white text-sm text-body file:mr-4 file:cursor-pointer file:border-0 file:bg-navy-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                  @change="handleEvidenceChange"
                />
                <BaseButton
                  v-if="evidenceFiles.length"
                  variant="primary"
                  size="sm"
                  :loading="addingEvidence"
                  class="mt-3"
                  @click="handleAddEvidence"
                >
                  {{ t("dispute.add_evidence") }}
                </BaseButton>
              </div>
            </BaseCard>
          </div>

          <aside class="space-y-4">
            <BaseCard padded>
              <h2 class="font-display text-base font-semibold text-heading">Case summary</h2>
              <dl class="mt-3 space-y-3 text-sm">
                <div>
                  <dt class="text-xs text-muted">Status</dt>
                  <dd class="mt-1"><StatusBadge :status="dispute.status" type="dispute" /></dd>
                </div>
                <div>
                  <dt class="text-xs text-muted">Opened</dt>
                  <dd class="mt-1 text-heading">{{ formatDateTime(dispute.created_at) }}</dd>
                </div>
                <div v-if="dispute.resolved_at">
                  <dt class="text-xs text-muted">Resolved</dt>
                  <dd class="mt-1 text-heading">{{ formatDateTime(dispute.resolved_at) }}</dd>
                </div>
              </dl>
            </BaseCard>

            <BaseCard v-if="dispute.status === 'resolved'" padded>
              <h2 class="font-display text-base font-semibold text-heading">Appeal</h2>
              <p class="mt-2 text-sm leading-6 text-body">
                If you disagree with the resolution, you can appeal within the
                deadline.
              </p>
              <BaseButton variant="outline" class="mt-3" @click="handleAppeal">
                {{ t("dispute.appeal_deadline") }}
              </BaseButton>
            </BaseCard>
          </aside>
        </div>
      </template>
    </main>
  </UserLayout>
</template>
