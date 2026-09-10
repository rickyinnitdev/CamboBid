<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { locale } = useI18n();
const open = ref(false);

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "km", name: "Khmer", flag: "🇰🇭" },
];

const currentLanguage = ref(
  languages.find((l) => l.code === locale.value) || languages[0]
);

function switchLanguage(lang) {
  locale.value = lang.code;
  currentLanguage.value = lang;
  localStorage.setItem("locale", lang.code);
  open.value = false;
}
</script>

<template>
  <div class="relative">
    <button
      class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-body hover:bg-surface transition-colors"
      @click="open = !open"
    >
      <span>{{ currentLanguage.flag }}</span>
      <span class="hidden sm:inline">{{ currentLanguage.code.toUpperCase() }}</span>
      <svg class="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-border py-1 z-50"
      >
        <button
          v-for="lang in languages"
          :key="lang.code"
          class="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface transition-colors"
          :class="lang.code === locale ? 'text-navy-700 font-medium' : 'text-body'"
          @click="switchLanguage(lang)"
        >
          <span>{{ lang.flag }}</span>
          <span>{{ lang.name }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>
