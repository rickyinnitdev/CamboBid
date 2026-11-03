<script setup>
import { watch, onMounted, onUnmounted } from "vue";

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: "" },
  maxWidth: { type: String, default: "md" },
  closeable: { type: Boolean, default: true },
});

const emit = defineEmits(["close"]);

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  full: "max-w-full",
};

function handleEscape(e) {
  if (e.key === "Escape" && props.closeable) emit("close");
}

watch(
  () => props.show,
  (show) => {
    document.body.style.overflow = show ? "hidden" : "";
  },
);

onMounted(() => document.addEventListener("keydown", handleEscape));
onUnmounted(() => {
  document.removeEventListener("keydown", handleEscape);
  document.body.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        :aria-label="title || 'Dialog'"
      >
        <div class="flex min-h-screen items-center justify-center px-4 py-8">
          <div
            class="fixed inset-0 bg-navy-900/45 backdrop-blur-[2px]"
            @click="closeable && emit('close')"
          />
          <Transition
            enter-active-class="duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-2 scale-[0.98]"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-1 scale-[0.98]"
          >
            <div
              v-if="show"
              :class="[
                'relative w-full rounded-2xl border border-border bg-white shadow-lg',
                maxWidthClasses[maxWidth],
              ]"
            >
              <div
                v-if="title || closeable"
                class="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6"
              >
                <h3 class="font-display text-lg font-semibold text-heading">
                  {{ title }}
                </h3>
                <button
                  v-if="closeable"
                  type="button"
                  class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-heading"
                  aria-label="Close dialog"
                  @click="emit('close')"
                >
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div class="px-5 py-5 sm:px-6">
                <slot />
              </div>
              <div
                v-if="$slots.footer"
                class="border-t border-border px-5 py-4 sm:px-6"
              >
                <slot name="footer" />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
