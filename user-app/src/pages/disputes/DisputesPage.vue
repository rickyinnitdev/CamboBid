<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import StatusBadge from "@/components/auction/StatusBadge.vue";
import { disputeService } from "@/services/disputeService";
import { formatDate } from "@/utils/format";

const { t } = useI18n();
const disputes = ref([]);
const loading = ref(true);
const error = ref("");

onMounted(async () => {
  try {
    disputes.value = await disputeService.getMyDisputes();
  } catch (err) {
    error.value = err.message || "Failed to load disputes.";
  } finally {
    loading.value = false;
  }
});

function getDisputeTitle(dispute) {
  return dispute.auctions?.listings?.title || "Untitled Auction";
}

function getDisputeImage(dispute) {
  const images = dispute.auctions?.listings?.images;
  if (Array.isArray(images) && images.length > 0) {
    return typeof images[0] === "string" ? images[0] : images[0]?.url;
  }
  return null;
}
</script>

<template>
  <UserLayout>
    <main class="page-container max-w-4xl">
      <div class="page-header">
        <div>
          <p class="kicker">Resolution centre</p>
          <h1 class="page-title mt-3">{{ t("nav.my_disputes") }}</h1>
          <p class="page-subtitle mt-3">
            Track cases you have opened on an order or auction.
          </p>
        </div>
        <router-link to="/disputes/file" class="btn-primary btn-sm self-start sm:self-auto">
          {{ t("dispute.file") }}
        </router-link>
      </div>

      <div v-if="loading" class="space-y-3">
        <BaseSkeleton v-for="i in 3" :key="i" type="card" />
      </div>

      <div
        v-else-if="error"
        role="alert"
        class="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger"
      >
        {{ error }}
      </div>

      <BaseEmptyState
        v-else-if="disputes.length === 0"
        title="No disputes"
        description="You haven't opened any disputes. If an order arrives damaged or not as described, you can open a case from that order."
        icon="inbox"
      >
        <template #action>
          <router-link to="/orders" class="btn-outline btn-sm mt-5">
            View your orders
          </router-link>
        </template>
      </BaseEmptyState>

      <div v-else class="space-y-3">
        <BaseCard v-for="dispute in disputes" :key="dispute.id" hover>
          <router-link
            :to="`/disputes/${dispute.id}`"
            class="flex items-center gap-4 p-4"
          >
            <div class="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface">
              <img
                v-if="getDisputeImage(dispute)"
                :src="getDisputeImage(dispute)"
                :alt="getDisputeTitle(dispute)"
                class="h-full w-full object-cover"
              />
              <div v-else class="grid h-full w-full place-items-center">
                <svg class="h-6 w-6 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>

            <div class="min-w-0 flex-1">
              <h2 class="truncate text-sm font-semibold text-heading">
                {{ getDisputeTitle(dispute) }}
              </h2>
              <p class="mt-1 truncate text-xs text-muted">
                {{ dispute.reason }} · {{ formatDate(dispute.created_at) }}
              </p>
            </div>

            <StatusBadge
              :status="dispute.status"
              type="dispute"
              class="shrink-0"
            />
          </router-link>
        </BaseCard>
      </div>
    </main>
  </UserLayout>
</template>
