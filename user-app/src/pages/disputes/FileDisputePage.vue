<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { disputeService } from "@/services/disputeService";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseCard from "@/components/base/BaseCard.vue";

const { t } = useI18n();
const router = useRouter();

const form = ref({
  auctionId: "",
  reason: "",
  description: "",
});

const evidenceFiles = ref([]);
const submitting = ref(false);
const error = ref("");

const reasons = [
  "Item not as described",
  "Item not received",
  "Item damaged",
  "Seller unresponsive",
  "Fraudulent listing",
  "Other",
];

function handleEvidenceChange(e) {
  evidenceFiles.value = Array.from(e.target.files || []);
}

async function handleSubmit() {
  submitting.value = true;
  error.value = "";
  try {
    await disputeService.fileDispute({
      auctionId: form.value.auctionId,
      reason: form.value.reason,
      description: form.value.description,
      evidence: evidenceFiles.value,
    });
    router.push("/disputes");
  } catch (err) {
    error.value = err.message || "Failed to file dispute.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UserLayout>
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 class="text-2xl font-bold text-heading mb-8">{{ t("dispute.file") }}</h1>

      <BaseCard>
        <div class="p-6">
          <div v-if="error" class="p-3 rounded-lg bg-danger/10 text-danger text-sm mb-4">{{ error }}</div>

          <form @submit.prevent="handleSubmit" class="space-y-6">
            <BaseInput
              v-model="form.auctionId"
              label="Auction ID"
              placeholder="Enter the auction ID"
              required
            />

            <div>
              <label class="block text-sm font-medium text-heading mb-1.5">{{ t("dispute.reason") }} *</label>
              <select
                v-model="form.reason"
                required
                class="block w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500"
              >
                <option value="" disabled>Select a reason</option>
                <option v-for="r in reasons" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-heading mb-1.5">{{ t("dispute.description") }}</label>
              <textarea
                v-model="form.description"
                rows="4"
                class="block w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 transition-colors resize-none"
                placeholder="Provide details about your dispute..."
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-heading mb-1.5">{{ t("dispute.evidence") }}</label>
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                class="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-navy-700 file:text-white hover:file:bg-navy-800 file:cursor-pointer"
                @change="handleEvidenceChange"
              />
              <p v-if="evidenceFiles.length" class="text-xs text-muted mt-2">{{ evidenceFiles.length }} file(s) selected</p>
            </div>

            <div class="flex items-center gap-3 pt-2">
              <BaseButton type="submit" variant="danger" :loading="submitting">
                {{ t("dispute.submit") }}
              </BaseButton>
              <router-link to="/disputes">
                <BaseButton variant="ghost">{{ t("common.cancel") }}</BaseButton>
              </router-link>
            </div>
          </form>
        </div>
      </BaseCard>
    </div>
  </UserLayout>
</template>
