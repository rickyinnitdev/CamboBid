<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";

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
  if (e.key === "Escape" && props.closeable) {
    emit("close");
  }
}

onMounted(() => document.addEventListener("keydown", handleEscape));
onUnmounted(() => document.removeEventListener("keydown", handleEscape));
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center px-4">
          <div class="fixed inset-0 bg-navy-900/50 backdrop-blur-sm" @click="closeable && emit('close')" />
          <Transition
            enter-active-class="ease-out duration-300"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="ease-in duration-200"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="show"
              :class="['relative bg-white rounded-xl shadow-xl w-full transform transition-all', maxWidthClasses[maxWidth]]"
            >
              <div v-if="title || closeable" class="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 class="text-lg font-semibold text-heading">{{ title }}</h3>
                <button v-if="closeable" class="text-muted hover:text-heading transition-colors" @click="emit('close')">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div class="px-6 py-4">
                <slot />
              </div>
              <div v-if="$slots.footer" class="px-6 py-4 border-t border-border">
                <slot name="footer" />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
