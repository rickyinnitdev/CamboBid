<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { documentService } from "@/services/documentService";
import { formatDateTime, formatUSD } from "@/utils/format";
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
const money = (n) => formatUSD(Number(n) / 100);
const print = () => window.print();
</script>
<template>
  <main class="document-page min-h-screen bg-surface p-4 sm:p-10">
    <div class="print-controls mx-auto mb-6 flex max-w-3xl flex-wrap items-center justify-between gap-4">
      <router-link
        to="/documents"
        class="text-sm font-medium text-body transition-colors hover:text-heading"
      >
        &larr; All documents
      </router-link>
      <div class="flex items-center gap-3">
        <button
          :disabled="!doc"
          class="btn-primary btn-sm"
          @click="print"
        >
          Print / Save PDF
        </button>
      </div>
    </div>

    <p
      v-if="error"
      role="alert"
      class="mx-auto max-w-3xl rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger"
    >
      {{ error }}
    </p>

    <article
      v-if="doc"
      class="document-sheet mx-auto max-w-3xl rounded-2xl border border-border bg-white p-7 shadow-sm sm:p-12"
    >
      <header class="flex flex-wrap justify-between gap-6 border-b border-border pb-8">
        <div>
          <p class="font-display text-2xl font-semibold tracking-[-0.03em] text-navy-900">
            CamboBid
          </p>
          <p class="mt-2 text-sm text-muted">{{ doc.snapshot.issuer }}</p>
        </div>
        <div class="text-right">
          <h1 class="font-display text-3xl font-semibold capitalize text-heading">
            {{ doc.kind }}
          </h1>
          <p class="mt-2 text-sm text-body">{{ doc.number }}</p>
          <p class="mt-1 text-xs text-muted">{{ formatDateTime(doc.created_at) }}</p>
        </div>
      </header>

      <p class="my-7 rounded-xl border border-gold-200 bg-gold-50 p-4 text-sm leading-6 text-gold-900">
        {{ doc.snapshot.notice }}
      </p>

      <div class="mb-10 grid gap-6 sm:grid-cols-2">
        <div>
          <p class="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
            Issued to
          </p>
          <p class="font-semibold text-heading">{{ doc.snapshot.buyer }}</p>
          <p class="mt-0.5 break-all text-sm text-body">{{ doc.snapshot.buyer_email }}</p>
        </div>
        <div>
          <p class="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
            Seller / service
          </p>
          <p class="text-sm text-body">{{ doc.snapshot.seller || "CamboBid wallet" }}</p>
          <p class="mt-2 text-xs uppercase tracking-wide text-muted">{{ doc.mode }} · USD</p>
        </div>
      </div>

      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th class="py-3 font-medium">Description</th>
            <th class="py-3 text-right font-medium">Qty</th>
            <th class="py-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-border">
            <td class="py-6 pr-3 text-body">{{ doc.snapshot.item }}</td>
            <td class="py-6 text-right text-body">1</td>
            <td class="numeric py-6 text-right font-medium text-heading">
              {{ money(doc.amount_minor) }}
            </td>
          </tr>
        </tbody>
      </table>

      <div class="flex justify-between border-b border-border py-6 font-display text-xl font-semibold text-heading">
        <span>Total (USD)</span>
        <span class="numeric">{{ money(doc.amount_minor) }}</span>
      </div>

      <p class="mt-6 text-sm leading-6 text-body">
        {{
          doc.kind === "invoice"
            ? "This invoice records an order. Payment is confirmed by a separate receipt."
            : doc.kind === "refund"
              ? "This document records the refund to your CamboBid wallet."
              : "Payment confirmed. Auction payments are held in escrow until settlement."
        }}
      </p>

      <footer class="mt-12 break-all border-t border-border pt-5 text-xs text-muted">
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
    border: 0 !important;
    max-width: none !important;
  }
}
</style>
