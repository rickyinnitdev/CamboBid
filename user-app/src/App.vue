<script setup>
import { onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";

const authStore = useAuthStore();
const settingsStore = useSettingsStore();

onMounted(async () => {
  // Run both in parallel — neither depends on the other
  await Promise.all([
    authStore.initialize(),
    settingsStore.fetchSettings(),
  ]);
});
</script>

<template>
  <div id="app" class="min-h-screen bg-surface">
    <router-view />
  </div>
</template>

<style>
#app {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.font-mono {
  font-family: "JetBrains Mono", "Fira Code", "Courier New", monospace;
}
</style>
