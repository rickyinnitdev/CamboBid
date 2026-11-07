<script setup>
import { computed, ref, onMounted } from "vue";
import { analyticsService } from "@/services/analyticsService";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import KhmerMark from "@/components/base/KhmerMark.vue";

const loading = ref(true);
const error = ref("");
const stats = ref({});

const totalAuctions = computed(() => Number(stats.value.totalAuctions || 0));
const activeAuctions = computed(() => Number(stats.value.activeAuctions || 0));
const totalBids = computed(() => Number(stats.value.totalBids || 0));
const totalUsers = computed(() => Number(stats.value.totalUsers || 0));
const disputeCount = computed(() => Number(stats.value.disputeCount || 0));
const totalGMV = computed(() => Number(stats.value.totalGMV || 0));
const platformRevenue = computed(() => Number(stats.value.platformRevenue || 0));

const liveShare = computed(() =>
  totalAuctions.value > 0
    ? Math.round((activeAuctions.value / totalAuctions.value) * 100)
    : 0,
);

const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const quickActions = [
  {
    label: "Review the saleroom",
    detail: "Lots, status and closing times",
    to: "/admin/auctions",
  },
  {
    label: "Approve listings",
    detail: "Objects waiting to be catalogued",
    to: "/admin/listings",
  },
  {
    label: "Resolve disputes",
    detail: "Open cases and buyer claims",
    to: "/admin/disputes",
  },
  {
    label: "Settle withdrawals",
    detail: "Payouts awaiting review",
    to: "/admin/withdrawals",
  },
];

onMounted(async () => {
  try {
    stats.value = await analyticsService.getDashboardStats();
  } catch (e) {
    error.value = e.message || "Failed to load the saleroom ledger";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <AdminLayout>
    <div class="space-y-7">
      <header class="page-header">
        <div>
          <p class="data-label flex items-center gap-2">
            <span class="inline-block h-1 w-1 rounded-full bg-gold-500" aria-hidden="true" />
            Saleroom ledger
          </p>
          <h1 class="page-title mt-2">The room at a glance</h1>
          <p class="page-subtitle">
            Live positions across the catalogue, bidders and settlement. Figures
            refresh when this page loads.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <router-link to="/admin/auctions" class="btn-outline btn-sm">
            View auctions
          </router-link>
          <router-link to="/admin/disputes" class="btn-primary btn-sm">
            Open disputes
          </router-link>
        </div>
      </header>

      <div v-if="loading" class="space-y-6">
        <div class="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
          <div class="rounded-xl border border-border bg-card p-8">
            <BaseSkeleton type="heading" :rows="1" />
            <div class="mt-8 h-16 w-40 rounded bg-navy-100/50" />
            <div class="mt-8 h-2 w-full rounded bg-navy-100/50" />
          </div>
          <div class="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
            <div v-for="i in 4" :key="i" class="bg-card p-6">
              <BaseSkeleton type="text" :rows="2" />
            </div>
          </div>
        </div>
        <div class="grid gap-6 lg:grid-cols-2">
          <div v-for="i in 2" :key="i" class="rounded-xl border border-border bg-card p-6">
            <BaseSkeleton type="heading" :rows="1" />
            <div class="mt-5">
              <BaseSkeleton type="text" :rows="3" />
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="error"
        role="alert"
        class="rounded-xl border border-laterite/25 bg-laterite/5 px-5 py-4 text-sm text-laterite"
      >
        {{ error }}
      </div>

      <template v-else>
        <!-- Ledger hero -->
        <section class="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
          <div class="relative overflow-hidden rounded-xl bg-ink p-7 text-white sm:p-9">
            <KhmerMark
              variant="wave"
              color="#C08A2E"
              :opacity="0.22"
              class="absolute inset-x-0 bottom-4 h-6 w-full"
            />
            <div
              class="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full border border-gold-500/15"
              aria-hidden="true"
            />
            <p class="text-xs font-medium text-gold-200/80">On the books</p>
            <div class="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
              <span class="font-display text-[4.25rem] font-normal leading-none tracking-[-0.04em]">
                {{ totalAuctions }}
              </span>
              <span class="pb-2 text-sm text-white/55">
                {{ totalAuctions === 1 ? "lot recorded" : "lots recorded" }}
              </span>
            </div>

            <div class="mt-9 max-w-md">
              <div class="flex items-baseline justify-between text-xs">
                <span class="text-white/60">Open for bidding</span>
                <span class="numeric text-gold-200">{{ activeAuctions }}</span>
              </div>
              <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  class="h-full rounded-full bg-gold-500 transition-[width] duration-500"
                  :style="{ width: `${liveShare}%` }"
                />
              </div>
              <p class="mt-3 text-xs leading-5 text-white/45">
                {{ liveShare }}% of the catalogue is live right now.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
            <div class="bg-card p-5 sm:p-6">
              <p class="data-label">Bids recorded</p>
              <p class="numeric mt-3 text-2xl font-medium text-heading sm:text-3xl">
                {{ totalBids }}
              </p>
              <p class="mt-1 text-xs text-muted">Across every lot</p>
            </div>
            <div class="bg-card p-5 sm:p-6">
              <p class="data-label">Registered users</p>
              <p class="numeric mt-3 text-2xl font-medium text-heading sm:text-3xl">
                {{ totalUsers }}
              </p>
              <p class="mt-1 text-xs text-muted">Bidders and visitors</p>
            </div>
            <div class="bg-card p-5 sm:p-6">
              <p class="data-label">Open disputes</p>
              <p
                class="numeric mt-3 text-2xl font-medium sm:text-3xl"
                :class="disputeCount > 0 ? 'text-laterite' : 'text-heading'"
              >
                {{ disputeCount }}
              </p>
              <p class="mt-1 text-xs text-muted">Last 30 days</p>
            </div>
            <div class="bg-card p-5 sm:p-6">
              <p class="data-label">Platform revenue</p>
              <p class="numeric mt-3 text-2xl font-medium text-heading sm:text-3xl">
                {{ money(platformRevenue) }}
              </p>
              <p class="mt-1 text-xs text-muted">Released settlement</p>
            </div>
          </div>
        </section>

        <!-- Ledger detail -->
        <section class="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div class="rounded-xl border border-border bg-card">
            <div class="flex items-baseline justify-between border-b border-border px-6 py-4">
              <h2 class="font-display text-lg font-medium text-heading">Settlement</h2>
              <span class="data-label">All time</span>
            </div>
            <dl class="px-6 py-2">
              <div class="ledger-row">
                <dt>Gross merchandise value</dt>
                <dd>{{ money(totalGMV) }}</dd>
              </div>
              <div class="ledger-row">
                <dt>Platform revenue</dt>
                <dd>{{ money(platformRevenue) }}</dd>
              </div>
              <div class="ledger-row">
                <dt>Open disputes</dt>
                <dd :class="disputeCount > 0 ? 'text-laterite' : ''">{{ disputeCount }}</dd>
              </div>
              <div class="ledger-row">
                <dt>Lots open for bidding</dt>
                <dd>{{ activeAuctions }} of {{ totalAuctions }}</dd>
              </div>
            </dl>
            <p class="border-t border-border px-6 py-4 text-xs leading-5 text-muted">
              Revenue is calculated from released escrow at a 5% platform fee.
            </p>
          </div>

          <div class="rounded-xl border border-border bg-card">
            <div class="flex items-baseline justify-between border-b border-border px-6 py-4">
              <h2 class="font-display text-lg font-medium text-heading">Where to go next</h2>
              <span class="data-label">Shortcuts</span>
            </div>
            <ul>
              <li v-for="action in quickActions" :key="action.to">
                <router-link
                  :to="action.to"
                  class="group flex items-center justify-between gap-4 border-b border-border/70 px-6 py-4 transition-colors last:border-b-0 hover:bg-paper"
                >
                  <span class="min-w-0">
                    <span class="block text-sm font-medium text-heading">{{ action.label }}</span>
                    <span class="mt-0.5 block text-xs text-muted">{{ action.detail }}</span>
                  </span>
                  <span
                    class="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500/60 transition-colors group-hover:bg-gold-500"
                    aria-hidden="true"
                  />
                </router-link>
              </li>
            </ul>
          </div>
        </section>
      </template>
    </div>
  </AdminLayout>
</template>
