<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import dayjs from "dayjs";

const props = defineProps({
  endTime: { type: String, required: true },
  status: { type: String, default: "live" },
  showBadge: { type: Boolean, default: true },
  size: { type: String, default: "md" },
});

const now = ref(Date.now());
let timer = null;

const timeRemaining = computed(() => {
  const end = dayjs(props.endTime);
  const diff = end.diff(now.value);

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, total: 0 };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
    total: diff,
  };
});

const isUrgent = computed(() => timeRemaining.value.total > 0 && timeRemaining.value.total < 60000);
const isCritical = computed(() => timeRemaining.value.total > 0 && timeRemaining.value.total < 10000);
const isExtended = computed(() => props.status === "extended");
const isEnded = computed(() => props.status === "closed" || timeRemaining.value.expired);

const formattedTime = computed(() => {
  const t = timeRemaining.value;
  if (t.expired) return "Ended";

  const parts = [];
  if (t.days > 0) parts.push(`${t.days}d`);
  if (t.hours > 0 || t.days > 0) parts.push(`${String(t.hours).padStart(2, "0")}h`);
  parts.push(`${String(t.minutes).padStart(2, "0")}m`);
  parts.push(`${String(t.seconds).padStart(2, "0")}s`);
  return parts.join(" ");
});

const sizeClasses = {
  sm: "text-sm font-mono",
  md: "text-lg font-mono font-semibold",
  lg: "text-2xl font-mono font-bold",
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
  <div class="inline-flex items-center gap-2">
    <span v-if="showBadge && isExtended" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gold-500/10 text-gold-700">
      EXTENDED
    </span>
    <span v-if="showBadge && isEnded" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-muted/20 text-muted">
      ENDED
    </span>
    <span
      :class="[
        sizeClasses[size],
        'tabular-nums tracking-tight',
        isEnded ? 'text-muted' : isCritical ? 'text-danger animate-flash-fast' : isUrgent ? 'text-danger' : 'text-heading',
      ]"
    >
      {{ formattedTime }}
    </span>
  </div>
</template>
