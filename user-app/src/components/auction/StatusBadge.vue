<script setup>
import { computed } from "vue";

const props = defineProps({
  status: { type: String, required: true },
  type: { type: String, default: "auction" },
});

const statusConfig = computed(() => {
  const configs = {
    auction: {
      scheduled: { label: "Scheduled", class: "bg-navy-700/10 text-navy-700" },
      live: { label: "Live", class: "bg-success/10 text-success" },
      extended: { label: "Extended", class: "bg-gold-500/10 text-gold-700" },
      closed: { label: "Closed", class: "bg-muted/20 text-muted" },
      cancelled: { label: "Cancelled", class: "bg-danger/10 text-danger" },
    },
    listing: {
      draft: { label: "Draft", class: "bg-muted/20 text-muted" },
      pending: { label: "Pending", class: "bg-warning/10 text-warning" },
      approved: { label: "Approved", class: "bg-success/10 text-success" },
      rejected: { label: "Rejected", class: "bg-danger/10 text-danger" },
      live: { label: "Live", class: "bg-success/10 text-success" },
      sold: { label: "Sold", class: "bg-gold-500/10 text-gold-700" },
    },
    escrow: {
      pending: { label: "Pending", class: "bg-warning/10 text-warning" },
      held: { label: "Held", class: "bg-navy-700/10 text-navy-700" },
      released: { label: "Released", class: "bg-success/10 text-success" },
      frozen: { label: "Frozen", class: "bg-danger/10 text-danger" },
      refunded: { label: "Refunded", class: "bg-muted/20 text-muted" },
    },
    dispute: {
      open: { label: "Open", class: "bg-warning/10 text-warning" },
      under_review: { label: "Under Review", class: "bg-navy-700/10 text-navy-700" },
      resolved: { label: "Resolved", class: "bg-success/10 text-success" },
      appealed: { label: "Appealed", class: "bg-gold-500/10 text-gold-700" },
      closed: { label: "Closed", class: "bg-muted/20 text-muted" },
    },
    bid: {
      active: { label: "Active", class: "bg-success/10 text-success" },
      outbid: { label: "Outbid", class: "bg-muted/20 text-muted" },
      retracted: { label: "Retracted", class: "bg-danger/10 text-danger" },
      winning: { label: "Winning", class: "bg-gold-500/10 text-gold-700" },
    },
  };

  return configs[props.type]?.[props.status] || { label: props.status, class: "bg-muted/20 text-muted" };
});
</script>

<template>
  <span :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusConfig.class]">
    <span
      v-if="status === 'live'"
      class="relative flex h-2 w-2 mr-1.5"
    >
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
      <span class="relative inline-flex rounded-full h-2 w-2 bg-success" />
    </span>
    {{ statusConfig.label }}
  </span>
</template>
