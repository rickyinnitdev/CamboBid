<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import UserLayout from "@/components/layout/UserLayout.vue";
import { documentService } from "@/services/documentService";
const route = useRoute(),
  documents = ref([]),
  emails = ref([]),
  error = ref(""),
  message = ref(""),
  busy = ref(false);
async function load() {
  documents.value = await documentService.list(route.query.order);
  emails.value = await documentService.emails();
}
onMounted(async () => {
  try {
    await load();
  } catch (e) {
    error.value = e.message;
  }
});
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n) / 100,
  );
const emailStatus = (id) =>
  emails.value.find((e) => e.document_id === id)?.status || "not queued";
async function send(id) {
  busy.value = true;
  error.value = "";
  message.value = "";
  try {
    const result = await documentService.send(id);
    message.value = result.configured
      ? result.accepted
        ? "Email accepted by provider."
        : "Email remains queued, already accepted, or awaiting retry. Check its status below."
      : "Email is queued. Your administrator needs to configure the email provider.";
    await load();
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <UserLayout
    ><main class="page-container max-w-6xl">
      <div class="page-header">
        <div>
          <p class="section-eyebrow">Your records</p>
          <h1 class="page-title">Invoices &amp; receipts</h1>
          <p class="page-subtitle">
            View, print or save a PDF using your browser’s print dialog.
          </p>
        </div>
        <router-link to="/wallet" class="btn-secondary"
          >Your wallet</router-link
        >
      </div>
      <p v-if="error" class="p-4 bg-red-50 text-red-700" role="alert">
        {{ error }}
      </p>
      <p v-if="message" class="p-4 bg-teal-50 text-teal-900" role="status">
        {{ message }}
      </p>
      <div class="bg-white rounded-2xl border overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-slate-500">
            <tr>
              <th class="p-5">Document</th>
              <th>Item</th>
              <th>Amount</th>
              <th>Environment</th>
              <th>Email</th>
              <th class="p-5">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in documents" :key="d.id" class="border-t">
              <td class="p-5">
                <router-link
                  :to="'/documents/' + d.id"
                  class="font-semibold text-teal-800"
                  >{{ d.number }}</router-link
                >
                <p class="text-xs text-slate-500 capitalize mt-1">
                  {{ d.kind }} ·
                  {{ new Date(d.created_at).toLocaleDateString() }}
                </p>
              </td>
              <td class="pr-4">{{ d.snapshot.item }}</td>
              <td class="pr-4 whitespace-nowrap">
                {{ money(d.amount_minor) }}
              </td>
              <td class="pr-4 uppercase text-xs">{{ d.mode }}</td>
              <td class="pr-4">{{ emailStatus(d.id) }}</td>
              <td class="p-5 whitespace-nowrap">
                <router-link :to="'/documents/' + d.id" class="underline"
                  >View / print</router-link
                ><button
                  :disabled="busy"
                  class="ml-4 underline disabled:opacity-40"
                  @click="send(d.id)"
                >
                  Email copy
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!documents.length" class="p-8 text-slate-500">
          No documents yet. Winning orders create invoices; confirmed payments
          create receipts.
        </p>
      </div>
      <p class="text-sm text-slate-500 mt-5">
        “Accepted” means the email provider accepted the message; it does not
        confirm delivery to the inbox.
      </p>
    </main></UserLayout
  >
</template>
