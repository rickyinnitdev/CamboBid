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
    <main class="page-container max-w-4xl">
      <div class="page-header">
        <div>
          <p class="kicker">Resolution centre</p>
          <h1 class="page-title mt-3">{{ t("dispute.file") }}</h1>
          <p class="page-subtitle mt-3">
            Describe what went wrong and attach any evidence. A reviewer will
            respond through the case page.
          </p>
        </div>
        <router-link to="/disputes" class="btn-outline btn-sm self-start sm:self-auto">
          All disputes
        </router-link>
      </div>

      <div class="grid gap-5 lg:grid-cols-[1fr_300px]">
        <BaseCard padded>
          <div
            v-if="error"
            role="alert"
            class="mb-5 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger"
          >
            {{ error }}
          </div>

          <form class="space-y-5" @submit.prevent="handleSubmit">
            <BaseInput
              v-model="form.auctionId"
              label="Auction ID"
              placeholder="Enter the auction ID"
              required
            />

            <div>
              <label for="dispute-reason" class="label">
                {{ t("dispute.reason") }} <span class="text-danger" aria-hidden="true">*</span>
              </label>
              <select id="dispute-reason" v-model="form.reason" required class="select">
                <option value="" disabled>Select a reason</option>
                <option v-for="r in reasons" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>

            <div>
              <label for="dispute-description" class="label">
                {{ t("dispute.description") }}
              </label>
              <textarea
                id="dispute-description"
                v-model="form.description"
                rows="5"
                class="input resize-none"
                placeholder="Provide details about your dispute..."
              />
            </div>

            <div>
              <label for="dispute-files" class="label">{{ t("dispute.evidence") }}</label>
              <input
                id="dispute-files"
                type="file"
                accept="image/*,.pdf"
                multiple
                class="block w-full cursor-pointer rounded-lg border border-line bg-white text-sm text-body file:mr-4 file:cursor-pointer file:border-0 file:bg-navy-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                @change="handleEvidenceChange"
              />
              <p v-if="evidenceFiles.length" class="mt-2 text-xs text-muted">
                {{ evidenceFiles.length }} file(s) selected
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <BaseButton type="submit" variant="danger" :loading="submitting">
                {{ t("dispute.submit") }}
              </BaseButton>
              <router-link to="/disputes">
                <BaseButton variant="ghost">{{ t("common.cancel") }}</BaseButton>
              </router-link>
            </div>
          </form>
        </BaseCard>

        <aside class="space-y-4">
          <BaseCard padded>
            <h2 class="font-display text-base font-semibold text-heading">
              Before you file
            </h2>
            <ul class="mt-3 space-y-3 text-sm leading-6 text-body">
              <li>Contact the seller first — most issues are resolved directly.</li>
              <li>Include photos of the item and packaging where possible.</li>
              <li>Keep the order number and delivery details ready.</li>
            </ul>
          </BaseCard>
          <BaseCard padded>
            <h2 class="font-display text-base font-semibold text-heading">
              What happens next
            </h2>
            <p class="mt-2 text-sm leading-6 text-body">
              The case is reviewed by staff. Payments related to the order may be
              frozen while the dispute is open.
            </p>
          </BaseCard>
        </aside>
      </div>
    </main>
  </UserLayout>
</template>
