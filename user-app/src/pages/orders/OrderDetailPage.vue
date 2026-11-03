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
import { formatDate, formatUSD } from "@/utils/format";

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

      <template v-else-if="order">
        <div class="page-header">
          <div>
            <p class="kicker">Order</p>
            <h1 class="page-title mt-3">{{ t("order.detail") }}</h1>
            <p class="mt-2 text-sm text-muted">
              Placed {{ formatDate(order.created_at) }}
            </p>
          </div>
          <StatusBadge :status="order.status" type="escrow" class="self-start sm:self-auto" />
        </div>

        <section
          v-if="
            user?.id === order.buyer_id &&
            order.funded_at &&
            ['held', 'released'].includes(order.status)
          "
          class="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6"
          role="status"
        >
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
            {{
              order.purchase_kind === "buy_now"
                ? "Purchase confirmed"
                : "Auction winner"
            }}
          </p>
          <h2 class="mt-2 font-display text-2xl font-semibold text-emerald-900">
            {{
              order.purchase_kind === "buy_now"
                ? "Congratulations — it’s yours."
                : "Congratulations — you won."
            }}
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-emerald-900">
            {{
              order.status === "held"
                ? "Your payment is confirmed and held for this order. Confirm delivery only after you receive your item."
                : "Your delivery is confirmed and payment has been released to the seller."
            }}
          </p>
          <router-link
            to="/orders"
            class="mt-3 inline-flex text-sm font-semibold text-emerald-900 underline"
          >
            View all wins &amp; purchases
          </router-link>
        </section>

        <section
          v-if="
            user?.id === order.seller_id &&
            order.status === 'held' &&
            order.funded_at
          "
          class="mb-6 rounded-2xl border border-navy-100 bg-navy-50 p-5 text-sm leading-6 text-navy-800"
        >
          Your buyer has paid. The funds are held for this order and will be
          credited to your wallet when the buyer confirms delivery.
        </section>

        <div class="mb-6 flex flex-wrap items-center gap-3">
          <router-link
            :to="{ path: '/documents', query: { order: order.id } }"
            class="btn-outline btn-sm"
          >
            Invoices &amp; receipts
          </router-link>
          <router-link
            v-if="order.status === 'pending'"
            :to="{ path: '/wallet', query: { order: order.id } }"
            class="btn-primary btn-sm"
          >
            Pay this order
          </router-link>
          <p class="text-sm text-muted">
            {{ order.payment_mode || "demo" }} funds · Held payment is released
            after delivery confirmation.
          </p>
        </div>

        <div
          v-if="success"
          role="status"
          class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {{ success }}
        </div>
        <div
          v-if="error"
          role="alert"
          class="mb-4 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger"
        >
          {{ error }}
        </div>

        <div class="grid gap-5 md:grid-cols-2">
          <BaseCard padded>
            <h2 class="font-display text-base font-semibold text-heading">Item</h2>
            <div class="mt-4 flex gap-4">
              <div class="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface">
                <img
                  v-if="getImage()"
                  :src="getImage()"
                  :alt="order.auctions?.listings?.title"
                  class="h-full w-full object-cover"
                />
              </div>
              <div class="min-w-0">
                <h3 class="font-medium text-heading">
                  {{ order.auctions?.listings?.title }}
                </h3>
                <p class="mt-1 text-sm capitalize text-muted">
                  {{ order.auctions?.listings?.condition }}
                </p>
              </div>
            </div>
          </BaseCard>

          <BaseCard padded>
            <h2 class="font-display text-base font-semibold text-heading">Summary</h2>
            <dl class="mt-4 space-y-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <dt class="text-body">{{ t("order.status") }}</dt>
                <dd><StatusBadge :status="order.status" type="escrow" /></dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-body">{{ t("order.amount") }}</dt>
                <dd class="numeric font-semibold text-heading">{{ formatUSD(order.amount) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-body">Date</dt>
                <dd class="text-heading">{{ formatDate(order.created_at) }}</dd>
              </div>
              <div v-if="order.released_at" class="flex items-center justify-between gap-3">
                <dt class="text-body">Released</dt>
                <dd class="text-heading">{{ formatDate(order.released_at) }}</dd>
              </div>
            </dl>
          </BaseCard>

          <BaseCard padded>
            <h2 class="font-display text-base font-semibold text-heading">Seller</h2>
            <div class="mt-4 flex items-center gap-3">
              <div class="grid h-10 w-10 place-items-center rounded-full bg-navy-900">
                <span class="text-sm font-semibold text-white">
                  {{ (order.seller?.display_name || "S").charAt(0).toUpperCase() }}
                </span>
              </div>
              <div>
                <p class="text-sm font-medium text-heading">
                  {{ order.seller?.display_name || "Unknown" }}
                </p>
              </div>
            </div>
          </BaseCard>

          <BaseCard
            v-if="
              order.status === 'held' &&
              order.funded_at &&
              user?.id === order.buyer_id
            "
            padded
          >
            <h2 class="font-display text-base font-semibold text-heading">Actions</h2>
            <p class="mt-2 text-sm leading-6 text-body">
              Once you receive the item, confirm delivery to release the escrow
              funds to the seller.
            </p>
            <BaseButton
              variant="success"
              :loading="confirming"
              class="mt-4"
              @click="handleConfirmDelivery"
            >
              {{ t("order.confirm_delivery") }}
            </BaseButton>
          </BaseCard>
        </div>
      </template>
    </main>
  </UserLayout>
</template>
