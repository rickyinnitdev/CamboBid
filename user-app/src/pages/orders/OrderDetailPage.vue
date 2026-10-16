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
    success.value =
      "Delivery confirmed. Funds have been credited to the seller’s wallet.";
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
    <div class="page-container max-w-3xl">
      <div class="mb-6">
        <button
          @click="router.back()"
          class="text-sm text-muted hover:text-heading transition-colors"
        >
          &larr; {{ t("common.back") }}
        </button>
      </div>

      <div v-if="loading" class="space-y-4">
        <BaseSkeleton type="card" />
      </div>

      <div
        v-else-if="error"
        class="p-4 rounded-lg bg-danger/10 text-danger text-sm"
      >
        {{ error }}
      </div>

      <template v-else-if="order">
        <h1 class="text-2xl font-bold text-heading mb-6">
          {{ t("order.detail") }}
        </h1>
        <section
          v-if="
            user?.id === order.buyer_id &&
            order.funded_at &&
            ['held', 'released'].includes(order.status)
          "
          class="rounded-2xl bg-teal-50 border border-teal-100 p-6 mb-6"
          role="status"
        >
          <p class="text-xs uppercase tracking-widest text-teal-700">
            {{
              order.purchase_kind === "buy_now"
                ? "Purchase confirmed"
                : "Auction winner"
            }}
          </p>
          <h2 class="text-2xl font-bold text-teal-900 mt-2">
            {{
              order.purchase_kind === "buy_now"
                ? "Congratulations — it’s yours!"
                : "Congratulations — you won!"
            }}
          </h2>
          <p class="text-sm text-teal-900 mt-3">
            {{
              order.status === "held"
                ? "Your payment is confirmed and held for this order. Confirm delivery only after you receive your item."
                : "Your delivery is confirmed and payment has been released to the seller."
            }}
          </p>
          <router-link to="/orders" class="inline-block text-sm underline mt-3"
            >View all wins &amp; purchases</router-link
          >
        </section>
        <section
          v-if="
            user?.id === order.seller_id &&
            order.status === 'held' &&
            order.funded_at
          "
          class="p-5 bg-blue-50 rounded-2xl mb-5 text-sm"
        >
          Your buyer has paid. The funds are held for this order and will be
          credited to your wallet when the buyer confirms delivery.
        </section>
        <router-link
          :to="{ path: '/documents', query: { order: order.id } }"
          class="inline-block mb-5 text-teal-800 underline"
          >View invoices &amp; receipts / Print</router-link
        >
        <p class="mb-4 text-sm text-slate-600">
          {{ order.payment_mode || "demo" }} funds · Held payment is released
          after delivery confirmation.
        </p>
        <router-link
          v-if="order.status === 'pending'"
          :to="{ path: '/wallet', query: { order: order.id } }"
          class="inline-block mb-4 rounded-xl bg-blue-800 px-5 py-3 text-white"
          >Pay this order</router-link
        >

        <div
          v-if="success"
          class="p-3 rounded-lg bg-success/10 text-success text-sm mb-4"
        >
          {{ success }}
        </div>
        <div
          v-if="error"
          class="p-3 rounded-lg bg-danger/10 text-danger text-sm mb-4"
        >
          {{ error }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Item Info -->
          <BaseCard>
            <div class="p-6">
              <h2 class="font-semibold text-heading mb-4">Item</h2>
              <div class="flex gap-4">
                <div
                  class="w-20 h-20 rounded-lg bg-surface overflow-hidden flex-shrink-0"
                >
                  <img
                    v-if="getImage()"
                    :src="getImage()"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 class="font-medium text-heading">
                    {{ order.auctions?.listings?.title }}
                  </h3>
                  <p class="text-sm text-muted mt-1">
                    {{ order.auctions?.listings?.condition }}
                  </p>
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
                <span class="font-bold font-mono text-gold-600"
                  >${{ Number(order.amount).toLocaleString() }}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-muted">Date</span>
                <span class="text-sm text-heading">{{
                  new Date(order.created_at).toLocaleDateString()
                }}</span>
              </div>
              <div v-if="order.released_at" class="flex justify-between">
                <span class="text-sm text-muted">Released</span>
                <span class="text-sm text-heading">{{
                  new Date(order.released_at).toLocaleDateString()
                }}</span>
              </div>
            </div>
          </BaseCard>

          <!-- Seller Info -->
          <BaseCard>
            <div class="p-6">
              <h2 class="font-semibold text-heading mb-3">Seller</h2>
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-full bg-navy-700 flex items-center justify-center"
                >
                  <span class="text-sm font-semibold text-white">
                    {{
                      (order.seller?.display_name || "S")
                        .charAt(0)
                        .toUpperCase()
                    }}
                  </span>
                </div>
                <div>
                  <p class="font-medium text-heading text-sm">
                    {{ order.seller?.display_name || "Unknown" }}
                  </p>
                </div>
              </div>
            </div>
          </BaseCard>

          <!-- Actions -->
          <BaseCard
            v-if="
              order.status === 'held' &&
              order.funded_at &&
              user?.id === order.buyer_id
            "
          >
            <div class="p-6">
              <h2 class="font-semibold text-heading mb-3">Actions</h2>
              <p class="text-sm text-muted mb-4">
                Once you receive the item, confirm delivery to release the
                escrow funds to the seller.
              </p>
              <BaseButton
                variant="success"
                :loading="confirming"
                @click="handleConfirmDelivery"
              >
                {{ t("order.confirm_delivery") }}
              </BaseButton>
            </div>
          </BaseCard>
        </div>
      </template>
    </div>
  </UserLayout>
</template>
