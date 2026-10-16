<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { securityService } from "@/services/securityService";
import UserLayout from "@/components/layout/UserLayout.vue";
const route = useRoute(),
  document = ref(null),
  error = ref("");
async function load() {
  error.value = "";
  document.value = null;
  try {
    document.value = (await securityService.policies()).find(
      (p) => p.kind === (route.path === "/privacy" ? "privacy" : "terms"),
    );
    if (!document.value) throw new Error("Policy unavailable");
  } catch (e) {
    error.value = e.message;
  }
}
onMounted(load);
watch(() => route.path, load);
</script>
<template>
  <UserLayout
    ><main class="page-container max-w-4xl">
      <p v-if="error" role="alert">{{ error }}</p>
      <article v-if="document" class="rounded-3xl border bg-white p-8">
        <h1 class="text-3xl font-bold">{{ document.title }}</h1>
        <p class="my-4 text-sm text-slate-500">
          Version {{ document.version }} · Published
          {{ new Date(document.published_at).toLocaleDateString() }}
        </p>
        <p class="whitespace-pre-line leading-8">{{ document.content }}</p>
      </article>
      <p v-else-if="!error">Loading policy…</p>
    </main></UserLayout
  >
</template>
