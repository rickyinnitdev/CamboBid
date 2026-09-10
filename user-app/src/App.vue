<script setup>
import { onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();

onMounted(async () => {
  await authStore.initialize();
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
