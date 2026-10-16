<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { documentService } from "@/services/documentService";
const route = useRoute(),
  doc = ref(null),
  error = ref("");
onMounted(async () => {
  try {
    doc.value = await documentService.get(route.params.id);
  } catch (e) {
    error.value = e.message;
  }
});
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n) / 100,
  );
const print = () => window.print();
</script>
<template>
  <main class="document-page min-h-screen bg-slate-100 p-5 sm:p-10">
    <div class="print-controls mx-auto max-w-3xl flex justify-between mb-6">
      <router-link to="/documents" class="underline"
        >← All documents</router-link
      ><button
        :disabled="!doc"
        class="bg-teal-800 text-white px-5 py-3 rounded-xl"
        @click="print"
      >
        Print / Save PDF
      </button>
    </div>
    <p v-if="error" role="alert">{{ error }}</p>
    <article
      v-if="doc"
      class="document-sheet mx-auto max-w-3xl bg-white p-7 sm:p-12 rounded-2xl shadow-sm"
    >
      <header class="flex justify-between gap-6 border-b pb-8">
        <div>
          <p class="text-2xl font-bold text-teal-800">CamboBid</p>
          <p class="text-sm text-slate-500 mt-2">{{ doc.snapshot.issuer }}</p>
        </div>
        <div class="text-right">
          <h1 class="text-3xl font-bold capitalize">{{ doc.kind }}</h1>
          <p class="text-sm mt-2">{{ doc.number }}</p>
          <p class="text-xs mt-2">
            {{ new Date(doc.created_at).toLocaleString() }}
          </p>
        </div>
      </header>
      <p class="my-7 p-4 rounded-lg bg-amber-50 text-sm">
        {{ doc.snapshot.notice }}
      </p>
      <div class="grid grid-cols-2 gap-6 mb-10">
        <div>
          <p class="text-xs uppercase text-slate-400 mb-2">Issued to</p>
          <p class="font-semibold">{{ doc.snapshot.buyer }}</p>
          <p class="text-sm break-all">{{ doc.snapshot.buyer_email }}</p>
        </div>
        <div>
          <p class="text-xs uppercase text-slate-400 mb-2">Seller / service</p>
          <p>{{ doc.snapshot.seller || "CamboBid wallet" }}</p>
          <p class="text-xs uppercase mt-2">{{ doc.mode }} · USD</p>
        </div>
      </div>
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b text-left text-slate-500">
            <th class="py-3">Description</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b">
            <td class="py-6 pr-3">{{ doc.snapshot.item }}</td>
            <td class="text-right">1</td>
            <td class="text-right">{{ money(doc.amount_minor) }}</td>
          </tr>
        </tbody>
      </table>
      <div class="flex justify-between font-bold text-xl py-8">
        <span>Total (USD)</span><span>{{ money(doc.amount_minor) }}</span>
      </div>
      <p class="text-sm text-slate-500">
        {{
          doc.kind === "invoice"
            ? "This invoice records an order. Payment is confirmed by a separate receipt."
            : doc.kind === "refund"
              ? "This document records the refund to your CamboBid wallet."
              : "Payment confirmed. Auction payments are held in escrow until settlement."
        }}
      </p>
      <footer class="mt-12 pt-5 border-t text-xs text-slate-400 break-all">
        <p v-if="doc.order_id">Order: {{ doc.order_id }}</p>
        <p v-if="doc.checkout_id">Checkout: {{ doc.checkout_id }}</p>
        <p class="mt-2">Document ID: {{ doc.id }}</p>
      </footer>
    </article>
  </main>
</template>
<style>
@media print {
  @page {
    size: A4;
    margin: 16mm;
  }
  body {
    background: white !important;
  }
  .print-controls {
    display: none !important;
  }
  .document-page {
    padding: 0 !important;
    background: white !important;
    min-height: 0 !important;
  }
  .document-sheet {
    padding: 0 !important;
    box-shadow: none !important;
    max-width: none !important;
  }
}
</style>
