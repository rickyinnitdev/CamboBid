<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import StatusBadge from "@/components/auction/StatusBadge.vue";
import { disputeService } from "@/services/disputeService";

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
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold text-heading">{{ t("nav.my_disputes") }}</h1>
        <router-link to="/disputes/file">
          <BaseButton variant="outline" size="sm">{{ t("dispute.file") }}</BaseButton>
        </router-link>
      </div>

      <div v-if="loading" class="space-y-4">
        <BaseSkeleton v-for="i in 3" :key="i" type="card" />
      </div>

      <div v-else-if="error" class="p-4 rounded-lg bg-danger/10 text-danger text-sm">{{ error }}</div>

      <BaseEmptyState
        v-else-if="disputes.length === 0"
        title="No Disputes"
        description="You don't have any disputes. Let's keep it that way!"
        icon="inbox"
      />

      <div v-else class="space-y-4">
        <BaseCard v-for="dispute in disputes" :key="dispute.id">
          <router-link :to="`/disputes/${dispute.id}`" class="flex items-center gap-4 p-4 hover:bg-surface/50 transition-colors">
            <div class="w-16 h-16 rounded-lg bg-surface overflow-hidden flex-shrink-0">
              <img v-if="getDisputeImage(dispute)" :src="getDisputeImage(dispute)" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-6 h-6 text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-heading truncate">{{ getDisputeTitle(dispute) }}</h3>
              <p class="text-xs text-muted mt-0.5">
                {{ dispute.reason }} • {{ new Date(dispute.created_at).toLocaleDateString() }}
              </p>
            </div>
            <StatusBadge :status="dispute.status" type="dispute" class="flex-shrink-0" />
          </router-link>
        </BaseCard>
      </div>
    </div>
  </UserLayout>
</template>
