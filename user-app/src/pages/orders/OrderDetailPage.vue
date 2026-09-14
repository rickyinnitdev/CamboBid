<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "@/composables/useAuth";
import { orderService } from "@/services/orderService";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import StatusBadge from "@/components/auction/StatusBadge.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { user } = useAuth();

const order = ref(null);
const loading = ref(true);
const confirming = ref(false);
const error = ref("");
const success = ref("");

onMounted(async () => {
  try {
    order.value = await orderService.getOrderById(route.params.id);
  } catch (err) {
    error.value = err.message || "Failed to load order.";
  } finally {
    loading.value = false;
  }
});

async function handleConfirmDelivery() {
  if (!confirm("Confirm that you have received the item?")) return;
  confirming.value = true;
  error.value = "";
  try {
    await orderService.confirmDelivery(order.value.id);
    success.value = "Delivery confirmed. Funds will be released to the seller.";
    order.value.status = "released";
  } catch (err) {
    error.value = err.message || "Failed to confirm delivery.";
  } finally {
    confirming.value = false;
  }
}

function getImage() {
  const images = order.value?.auctions?.listings?.images;
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

      <template v-else-if="order">
        <h1 class="text-2xl font-bold text-heading mb-6">{{ t("order.detail") }}</h1>

        <div v-if="success" class="p-3 rounded-lg bg-success/10 text-success text-sm mb-4">{{ success }}</div>
        <div v-if="error" class="p-3 rounded-lg bg-danger/10 text-danger text-sm mb-4">{{ error }}</div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Item Info -->
          <BaseCard>
            <div class="p-6">
              <h2 class="font-semibold text-heading mb-4">Item</h2>
              <div class="flex gap-4">
                <div class="w-20 h-20 rounded-lg bg-surface overflow-hidden flex-shrink-0">
                  <img v-if="getImage()" :src="getImage()" class="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 class="font-medium text-heading">{{ order.auctions?.listings?.title }}</h3>
                  <p class="text-sm text-muted mt-1">{{ order.auctions?.listings?.condition }}</p>
                </div>
              </div>
            </div>
          </BaseCard>

          <!-- Order Info -->
          <BaseCard>
            <div class="p-6 space-y-3">
              <div class="flex justify-between">
                <span class="text-sm text-muted">{{ t("order.status") }}</span>
                <StatusBadge :status="order.status" type="escrow" />
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-muted">{{ t("order.amount") }}</span>
                <span class="font-bold font-mono text-gold-600">${{ Number(order.amount).toLocaleString() }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-muted">Date</span>
                <span class="text-sm text-heading">{{ new Date(order.created_at).toLocaleDateString() }}</span>
              </div>
              <div v-if="order.released_at" class="flex justify-between">
                <span class="text-sm text-muted">Released</span>
                <span class="text-sm text-heading">{{ new Date(order.released_at).toLocaleDateString() }}</span>
              </div>
            </div>
          </BaseCard>

          <!-- Seller Info -->
          <BaseCard>
            <div class="p-6">
              <h2 class="font-semibold text-heading mb-3">Seller</h2>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-navy-700 flex items-center justify-center">
                  <span class="text-sm font-semibold text-white">
                    {{ (order.seller?.display_name || "S").charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div>
                  <p class="font-medium text-heading text-sm">{{ order.seller?.display_name || "Unknown" }}</p>
                </div>
              </div>
            </div>
          </BaseCard>

          <!-- Actions -->
          <BaseCard v-if="order.status === 'held' && user?.id === order.buyer_id">
            <div class="p-6">
              <h2 class="font-semibold text-heading mb-3">Actions</h2>
              <p class="text-sm text-muted mb-4">Once you receive the item, confirm delivery to release the escrow funds to the seller.</p>
              <BaseButton variant="success" :loading="confirming" @click="handleConfirmDelivery">
                {{ t("order.confirm_delivery") }}
              </BaseButton>
            </div>
          </BaseCard>
        </div>
      </template>
    </div>
  </UserLayout>
</template>
