<script setup>
import { computed } from "vue";

const props = defineProps({
  status: { type: String, required: true },
  type: { type: String, default: "auction" },
});

const statusConfig = computed(() => {
  const configs = {
    auction: {
      scheduled: { label: "Upcoming", class: "bg-navy-50 text-navy-800" },
      live: { label: "Live", class: "bg-emerald-50 text-emerald-800" },
      extended: { label: "Extended", class: "bg-amber-50 text-amber-800" },
      closed: { label: "Ended", class: "bg-slate-100 text-slate-600" },
      cancelled: { label: "Cancelled", class: "bg-red-50 text-red-700" },
    },
    listing: {
      draft: { label: "Draft", class: "bg-slate-100 text-slate-600" },
      pending: { label: "In review", class: "bg-amber-50 text-amber-800" },
      approved: { label: "Approved", class: "bg-emerald-50 text-emerald-800" },
      rejected: { label: "Rejected", class: "bg-red-50 text-red-700" },
      live: { label: "Live", class: "bg-emerald-50 text-emerald-800" },
      sold: { label: "Sold", class: "bg-gold-50 text-gold-800" },
    },
    escrow: {
      pending: { label: "Payment due", class: "bg-amber-50 text-amber-800" },
      held: { label: "Payment held", class: "bg-navy-50 text-navy-800" },
      released: { label: "Released", class: "bg-emerald-50 text-emerald-800" },
      frozen: { label: "Frozen", class: "bg-red-50 text-red-700" },
      refunded: { label: "Refunded", class: "bg-slate-100 text-slate-600" },
    },
    dispute: {
      open: { label: "Open", class: "bg-amber-50 text-amber-800" },
      under_review: { label: "Under review", class: "bg-navy-50 text-navy-800" },
      resolved: { label: "Resolved", class: "bg-emerald-50 text-emerald-800" },
      appealed: { label: "Appealed", class: "bg-gold-50 text-gold-800" },
      closed: { label: "Closed", class: "bg-slate-100 text-slate-600" },
    },
    bid: {
      active: { label: "Active", class: "bg-emerald-50 text-emerald-800" },
      outbid: { label: "Outbid", class: "bg-slate-100 text-slate-600" },
      retracted: { label: "Retracted", class: "bg-red-50 text-red-700" },
      winning: { label: "Winning", class: "bg-gold-50 text-gold-800" },
    },
  };

  return (
    configs[props.type]?.[props.status] || {
      label: props.status,
      class: "bg-slate-100 text-slate-600",
    }
  );
});
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
      statusConfig.class,
    ]"
  >
    <span
      v-if="status === 'live'"
      class="relative flex h-1.5 w-1.5"
      aria-hidden="true"
    >
      <span
        class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-600 opacity-60"
      />
      <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
    </span>
    {{ statusConfig.label }}
  </span>
</template>
