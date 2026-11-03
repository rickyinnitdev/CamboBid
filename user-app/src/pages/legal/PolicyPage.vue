<script setup>
import { computed, ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { securityService } from "@/services/securityService";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import KhmerDivider from "@/components/base/KhmerDivider.vue";
import { formatDate } from "@/utils/format";
const route = useRoute(),
  document = ref(null),
  loading = ref(true),
  error = ref("");

const isPrivacy = computed(() => route.path === "/privacy");
const fallbackTitle = computed(() =>
  isPrivacy.value ? "Privacy Policy" : "Terms & Conditions",
);

function withTimeout(promise, ms = 6000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("The policy service is unavailable right now.")),
        ms,
      ),
    ),
  ]);
}

async function load() {
  error.value = "";
  document.value = null;
  loading.value = true;
  try {
    const policies = await withTimeout(securityService.policies());
    document.value = policies.find(
      (p) => p.kind === (route.path === "/privacy" ? "privacy" : "terms"),
    );
    if (!document.value) throw new Error("Policy unavailable");
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch(() => route.path, load);
</script>
<template>
  <UserLayout>
    <main class="page-container max-w-4xl">
      <div class="page-header">
        <div>
          <p class="kicker">Legal</p>
          <h1 class="page-title mt-3">{{ document?.title || fallbackTitle }}</h1>
          <p v-if="document" class="mt-2 text-sm text-muted">
            Version {{ document.version }} · Published
            {{ formatDate(document.published_at) }}
          </p>
        </div>
        <router-link to="/" class="btn-outline btn-sm self-start sm:self-auto">
          Back to CamboBid
        </router-link>
      </div>

      <KhmerDivider class="mb-6" />

      <div v-if="loading" class="surface-panel space-y-3 p-6 sm:p-10">
        <div class="h-5 w-40 animate-pulse rounded bg-slate-200/70" />
        <BaseSkeleton :lines="8" />
      </div>

      <div
        v-else-if="error"
        role="alert"
        class="surface-panel p-6 sm:p-8"
      >
        <h2 class="font-display text-lg font-semibold text-heading">
          {{ fallbackTitle }} could not be loaded
        </h2>
        <p class="mt-2 max-w-xl text-sm leading-6 text-body">
          {{ error }} Please check your connection and try again.
          <template v-if="isPrivacy">
            You can also read the current Terms &amp; Conditions from the
            footer.
          </template>
        </p>
        <button class="btn-primary btn-sm mt-5" @click="load">Try again</button>
      </div>

      <article v-else-if="document" class="surface-panel p-6 sm:p-10">
        <p class="whitespace-pre-line text-[15px] leading-8 text-body">
          {{ document.content }}
        </p>
      </article>
    </main>
  </UserLayout>
</template>
