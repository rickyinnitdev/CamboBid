<script setup>
import { computed } from "vue";
import dayjs from "dayjs";

const props = defineProps({
  bid: { type: Object, required: true },
  isHighest: { type: Boolean, default: false },
  showBidder: { type: Boolean, default: true },
});

const timeAgo = computed(() => {
  return dayjs(props.bid.placed_at).fromNow();
});
</script>

<template>
  <div
    :class="[
      'flex items-center justify-between px-4 py-3 border-b border-border last:border-0 transition-colors',
      isHighest ? 'bg-gold-500/5' : 'hover:bg-surface/50',
    ]"
  >
    <div class="flex items-center gap-3">
      <div class="relative" v-if="showBidder">
        <img
          v-if="bid.profiles?.avatar_url"
          :src="bid.profiles.avatar_url"
          :alt="bid.profiles?.display_name"
          class="w-8 h-8 rounded-full object-cover"
        />
        <div v-else class="w-8 h-8 rounded-full bg-navy-700/10 flex items-center justify-center">
          <span class="text-xs font-semibold text-navy-700">
            {{ (bid.profiles?.display_name || "U").charAt(0).toUpperCase() }}
          </span>
        </div>
      </div>
      <div>
        <p v-if="showBidder" class="text-sm font-medium text-heading">
          {{ bid.profiles?.display_name || "Anonymous" }}
          <span v-if="bid.is_proxy" class="text-xs text-muted ml-1">(proxy)</span>
        </p>
        <p class="text-xs text-muted">{{ bid.placed_at ? dayjs(bid.placed_at).format("MMM D, HH:mm") : "" }}</p>
      </div>
    </div>

    <div class="text-right">
      <p
        :class="[
          'font-mono font-bold',
          isHighest ? 'text-gold-600 text-lg' : 'text-heading',
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
