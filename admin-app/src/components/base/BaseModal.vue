<script setup>
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: "" },
  maxWidth: { type: String, default: "md" },
});

defineEmits(["close"]);

const maxWidths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-xl", "2xl": "max-w-2xl" };
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center p-4">
          <div class="fixed inset-0 bg-navy-900/50 backdrop-blur-sm" @click="$emit('close')" />
          <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="open"
              :class="['relative bg-white rounded-xl shadow-xl w-full', maxWidths[maxWidth]]"
            >
              <div v-if="title" class="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 class="text-lg font-semibold text-heading">{{ title }}</h3>
                <button class="text-muted hover:text-heading transition-colors" @click="$emit('close')">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div class="p-6">
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
