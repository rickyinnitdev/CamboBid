<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import UserLayout from "@/components/layout/UserLayout.vue";
import KhmerDivider from "@/components/base/KhmerDivider.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import { documentService } from "@/services/documentService";
import { formatDate, formatUSD } from "@/utils/format";
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
const money = (n) => formatUSD(Number(n) / 100);
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
  <UserLayout>
    <main class="page-container max-w-6xl">
      <KhmerDivider class="mb-6" />
      <div class="page-header">
        <div>
          <p class="kicker">Your records</p>
          <h1 class="page-title mt-3">Invoices &amp; receipts</h1>
          <p class="page-subtitle mt-3">
            View, print or save a PDF using your browser’s print dialog.
          </p>
        </div>
        <router-link to="/wallet" class="btn-outline btn-sm self-start sm:self-auto">
          Your wallet
        </router-link>
      </div>

      <div
        v-if="error"
        role="alert"
        class="mb-5 rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger"
      >
        {{ error }}
      </div>
      <div
        v-if="message"
        role="status"
        class="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
      >
        {{ message }}
      </div>

      <BaseEmptyState
        v-if="!documents.length"
        title="No documents yet"
        description="Winning orders create invoices; confirmed payments create receipts."
        icon="inbox"
      >
        <template #action>
          <router-link to="/orders" class="btn-primary btn-sm mt-5">
            View your orders
          </router-link>
        </template>
      </BaseEmptyState>

      <div v-else class="surface-panel overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">Document</th>
                <th scope="col">Item</th>
                <th scope="col">Amount</th>
                <th scope="col">Environment</th>
                <th scope="col">Email</th>
                <th scope="col" class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border bg-white">
              <tr v-for="d in documents" :key="d.id">
                <td class="px-5 py-4">
                  <router-link
                    :to="'/documents/' + d.id"
                    class="font-semibold text-navy-700 hover:text-navy-900"
                  >
                    {{ d.number }}
                  </router-link>
                  <p class="mt-1 text-xs capitalize text-muted">
                    {{ d.kind }} · {{ formatDate(d.created_at) }}
                  </p>
                </td>
                <td class="px-4 py-4 text-sm text-body">{{ d.snapshot.item }}</td>
                <td class="numeric whitespace-nowrap px-4 py-4 text-sm font-medium text-heading">
                  {{ money(d.amount_minor) }}
                </td>
                <td class="px-4 py-4 text-xs uppercase tracking-wide text-muted">
                  {{ d.mode }}
                </td>
                <td class="px-4 py-4 text-sm capitalize text-body">
                  {{ emailStatus(d.id) }}
                </td>
                <td class="whitespace-nowrap px-5 py-4 text-right text-sm">
                  <router-link
                    :to="'/documents/' + d.id"
                    class="font-semibold text-navy-700 hover:text-navy-900"
                  >
                    View / print
                  </router-link>
                  <button
                    :disabled="busy"
                    class="ml-4 font-semibold text-body underline hover:text-heading disabled:opacity-40"
                    @click="send(d.id)"
                  >
                    Email copy
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="mt-5 text-xs leading-5 text-muted">
        “Accepted” means the email provider accepted the message; it does not
        confirm delivery to the inbox.
      </p>
    </main>
  </UserLayout>
</template>
