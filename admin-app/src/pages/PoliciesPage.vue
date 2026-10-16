<script setup>
import { ref, onMounted } from "vue";
import { securityService, rpc } from "@/services/securityService";
import AdminLayout from "@/layouts/AdminLayout.vue";
import { useAuthStore } from "@/stores/auth";
const auth = useAuthStore(),
  policies = ref([]),
  kind = ref("terms"),
  version = ref(""),
  title = ref(""),
  content = ref(""),
  confirmed = ref(false),
  busy = ref(false),
  error = ref(""),
  success = ref("");
function select() {
  const p = policies.value.find((p) => p.kind === kind.value);
  title.value = p?.title || "";
  content.value = p?.content || "";
  version.value = "";
  confirmed.value = false;
}
async function load() {
  policies.value = await securityService.policies();
  select();
}
onMounted(async () => {
  try {
    await load();
  } catch (e) {
    error.value = e.message;
  }
});
async function publish() {
  busy.value = true;
  error.value = "";
  success.value = "";
  try {
    await rpc("publish_policy", {
      p_kind: kind.value,
      p_version: version.value,
      p_title: title.value,
      p_content: content.value,
    });
    await load();
    success.value =
      "New version published. Users must accept it before protected actions.";
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <AdminLayout
    ><main class="max-w-4xl space-y-6">
      <h1 class="text-3xl font-bold">Terms &amp; Privacy Policy</h1>
      <p class="text-slate-600">
        Published versions stay in the acceptance history. Publish a new version
        to change a document; users must review it again.
      </p>
      <p
        v-if="error"
        role="alert"
        class="rounded-xl bg-red-50 p-4 text-red-700"
      >
        {{ error }}
      </p>
      <p v-if="success" role="status" class="rounded-xl bg-green-50 p-4">
        {{ success }}
      </p>
      <section class="rounded-2xl border bg-white p-6 space-y-4">
        <label class="block text-sm"
          >Document<select
            v-model="kind"
            class="block mt-2 rounded-xl border p-3"
            @change="select"
          >
            <option value="terms">Terms &amp; Conditions</option>
            <option value="privacy">Privacy Policy</option>
          </select></label
        >
        <p class="text-sm text-muted">
          Current version: {{ policies.find((p) => p.kind === kind)?.version }}
        </p>
        <label class="block text-sm"
          >Title<input
            v-model="title"
            class="mt-2 block w-full rounded-xl border p-3" /></label
        ><label class="block text-sm"
          >New unique version<input
            v-model="version"
            placeholder="e.g. demo-2.1"
            class="mt-2 block w-full rounded-xl border p-3" /></label
        ><label class="block text-sm"
          >Full document<textarea
            v-model="content"
            rows="18"
            class="mt-2 block w-full rounded-xl border p-3 leading-7"
          /></label
        ><label class="flex gap-3 text-sm"
          ><input v-model="confirmed" type="checkbox" />I reviewed the text and
          intend to publish this version for all users.</label
        ><button
          :disabled="
            busy || !confirmed || !version.trim() || !auth.isSuperAdmin
          "
          class="rounded-xl bg-blue-800 px-5 py-3 text-white disabled:opacity-50"
          @click="publish"
        >
          Publish new version
        </button>
        <p v-if="!auth.isSuperAdmin" class="text-sm text-slate-500">
          Only a super admin can publish policies.
        </p>
      </section>
    </main></AdminLayout
  >
</template>
