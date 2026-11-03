<script setup>
import dayjs from "dayjs";

defineProps({
  bid: { type: Object, required: true },
  isHighest: { type: Boolean, default: false },
  showBidder: { type: Boolean, default: true },
});
</script>

<template>
  <div
    :class="[
      'flex items-center justify-between border-b border-border px-4 py-3 transition-colors last:border-0',
      isHighest ? 'bg-gold-50/60' : 'hover:bg-surface/60',
    ]"
  >
    <div class="flex items-center gap-3">
      <div v-if="showBidder" class="relative">
        <img
          v-if="bid.bidder?.avatar_url"
          :src="bid.bidder.avatar_url"
          :alt="bid.bidder?.display_name"
          class="h-8 w-8 rounded-full object-cover"
        />
        <div
          v-else
          class="grid h-8 w-8 place-items-center rounded-full bg-navy-100"
        >
          <span class="text-xs font-semibold text-navy-800">
            {{ (bid.bidder?.display_name || "U").charAt(0).toUpperCase() }}
          </span>
        </div>
      </div>
      <div>
        <p v-if="showBidder" class="text-sm font-medium text-heading">
          {{ bid.bidder?.display_name || "Anonymous" }}
          <span v-if="bid.is_proxy" class="ml-1 text-xs text-muted">(proxy)</span>
        </p>
        <p class="text-xs text-muted">
          {{ bid.placed_at ? dayjs(bid.placed_at).format("MMM D, HH:mm") : "" }}
        </p>
      </div>
    </div>

    <div class="text-right">
      <p
        :class="[
          'numeric font-semibold',
          isHighest ? 'text-lg text-gold-700' : 'text-heading',
        ]"
      >
        ${{ Number(bid.amount).toLocaleString() }}
      </p>
      <span
        v-if="bid.status === 'winning' && isHighest"
        class="text-xs font-medium text-success"
      >
        Winning
      </span>
      <span v-else-if="bid.status === 'outbid'" class="text-xs text-muted">
        Outbid
      </span>
    </div>
  </div>
</template>
