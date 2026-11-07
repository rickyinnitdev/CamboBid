<script setup>
defineProps({
  variant: { type: String, default: "temple" },
  color: { type: String, default: "#C08A2E" },
  opacity: { type: Number, default: 0.5 },
  strokeWidth: { type: Number, default: 1 },
});
</script>

<template>
  <svg
    v-if="variant === 'temple'"
    viewBox="0 0 120 100"
    fill="none"
    :stroke="color"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    :style="{ opacity }"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Stepped terrace -->
    <path d="M6 94h108M14 94V86h92v8M24 86V79h72v7" opacity=".7" />
    <path d="M32 94V86M48 94V86M64 94V86M80 94V86M96 94V86" opacity=".3" />
    <!-- Central prang -->
    <path d="M52 79V70h-4v-8h-3v-8h-3v-9h3v-8c0-9 3-18 7-26 4 8 7 17 7 26v8h3v9h-3v8h-4v9" />
    <path d="M60 20c-3-5-3-10 0-15 3 5 3 10 0 15Z" />
    <path d="M60 5l3-4-3-4-3 4Z" opacity=".75" />
    <path d="M49 66h22M50 58h20M51 50h18M53 42h14" opacity=".45" />
    <!-- Flanking prangs -->
    <path d="M24 79v-7h-3v-7h-2v-8h2v-6c0-7 2-13 5-19 3 6 5 12 5 19v6h2v8h-2v7h-3v7" opacity=".85" />
    <path d="M26 33c-2-4-2-8 0-12 2 4 2 8 0 12Z" opacity=".85" />
    <path d="M94 79v-7h3v-7h2v-8h-2v-6c0-7-2-13-5-19-3 6-5 12-5 19v6h-2v8h2v7h3v7" opacity=".85" />
    <path d="M92 33c2-4 2-8 0-12-2 4-2 8 0 12Z" opacity=".85" />
    <!-- Gallery pavilions -->
    <path d="M10 79v-8h12v8M10 71l6-5 6 5M98 79v-8h12v8M98 71l6-5 6 5" opacity=".7" />
  </svg>

  <svg
    v-else-if="variant === 'seal'"
    viewBox="0 0 32 32"
    fill="none"
    :stroke="color"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    :style="{ opacity }"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Compact prang seal for small brand marks. -->
    <path d="M16 3c-3 5-3 9 0 14 3-5 3-9 0-14Z" />
    <path d="M16 17v12M11 21c-2-1-4-1.4-6-1 1.4 1.7 3.3 2.7 6 3M21 21c2-1 4-1.4 6-1-1.4 1.7-3.3 2.7-6 3" />
    <path d="M9 25h14M11 29h10" />
  </svg>

  <svg
    v-else-if="variant === 'wave'"
    viewBox="0 0 240 24"
    fill="none"
    :stroke="color"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    :style="{ opacity }"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Naga balustrade rhythm: repeated arches with lotus-bud finials. -->
    <path d="M0 19c10 0 10-10 20-10s10 10 20 10 10-10 20-10 10 10 20 10 10-10 20-10 10 10 20 10 10-10 20-10 10 10 20 10 10-10 20-10 10 10 20 10 10-10 20-10 10 10 20 10" />
    <path d="M10 4c-2 3-2 6 0 9 2-3 2-6 0-9ZM50 4c-2 3-2 6 0 9 2-3 2-6 0-9ZM90 4c-2 3-2 6 0 9 2-3 2-6 0-9ZM130 4c-2 3-2 6 0 9 2-3 2-6 0-9ZM170 4c-2 3-2 6 0 9 2-3 2-6 0-9ZM210 4c-2 3-2 6 0 9 2-3 2-6 0-9Z" opacity=".65" />
  </svg>

  <svg
    v-else
    viewBox="0 0 80 80"
    fill="none"
    :stroke="color"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    :style="{ opacity }"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Corner motif: quarter medallion with a temple finial. -->
    <path d="M2 78V20C2 10 10 2 20 2h58" opacity=".5" />
    <path d="M14 78V30c0-9 7-16 16-16h48" opacity=".35" />
    <path d="M40 54c-8-7-12-16-12-27 7 3 12 8 15 15 3-7 8-12 15-15 0 11-4 20-12 27" />
    <path d="M43 20c-2-4-2-8 0-12 2 4 2 8 0 12Z" />
    <circle cx="43" cy="55" r="1.5" :fill="color" stroke="none" />
  </svg>
</template>
