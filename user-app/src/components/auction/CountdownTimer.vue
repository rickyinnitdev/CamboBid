<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";

const props = defineProps({
  endTime: { type: String, default: "" },
  status: { type: String, default: "live" },
  showBadge: { type: Boolean, default: true },
  size: { type: String, default: "md" },
});

const now = ref(Date.now());
let timer = null;

const remaining = computed(() => {
  if (!props.endTime) return 0;
  const end = new Date(props.endTime).getTime();
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, end - now.value);
});

const expired = computed(() => remaining.value <= 0 || props.status === "closed");
const urgent = computed(
  () => !expired.value && remaining.value <= 60 * 60 * 1000,
);
const critical = computed(
  () => !expired.value && remaining.value <= 10 * 60 * 1000,
);

const formatted = computed(() => {
  if (expired.value) return "Ended";
  const totalSeconds = Math.floor(remaining.value / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${String(hours).padStart(2, "0")}h`;
  if (hours > 0) return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  return `${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
});

const accessibleLabel = computed(() =>
  expired.value ? "Auction ended" : `Time remaining: ${formatted.value}`,
);

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <span
    :class="[
      'numeric inline-flex items-center font-semibold tabular-nums',
      sizeClasses[size],
      expired ? 'text-slate-500' : critical ? 'text-red-700' : urgent ? 'text-amber-700' : 'text-heading',
    ]"
    :aria-label="accessibleLabel"
    :title="accessibleLabel"
    role="timer"
  >
    {{ formatted }}
  </span>
</template>
