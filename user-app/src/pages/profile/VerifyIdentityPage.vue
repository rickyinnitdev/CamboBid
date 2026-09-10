<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAuth } from "@/composables/useAuth";
import { authService } from "@/services/authService";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseBadge from "@/components/base/BaseBadge.vue";

const { t } = useI18n();
const { user, profile, refreshProfile } = useAuth();

const identityFile = ref(null);
const uploading = ref(false);
const error = ref("");
const success = ref("");

const verificationStatus = computed(() => {
  if (profile.value?.identity_verified) return "verified";
  if (profile.value?.identity_document_url) return "pending";
  return "not_verified";
});

function handleFileChange(e) {
  identityFile.value = e.target.files?.[0] || null;
}

async function handleUpload() {
  if (!identityFile.value || !user.value) return;
  uploading.value = true;
  error.value = "";
  success.value = "";
  try {
    await authService.uploadIdentityDocument(user.value.id, identityFile.value);
    await refreshProfile();
    success.value = "Document uploaded. Your identity is now under review.";
    identityFile.value = null;
  } catch (err) {
    error.value = err.message || "Upload failed. Please try again.";
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <UserLayout>
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 class="text-2xl font-bold text-heading mb-2">{{ t("profile.identity_status") }}</h1>
      <p class="text-sm text-muted mb-8">Verify your identity to unlock full bidding capabilities.</p>

      <BaseCard>
        <div class="p-6 space-y-6">
          <!-- Status -->
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-heading">Current Status:</span>
            <BaseBadge v-if="verificationStatus === 'verified'" variant="success">{{ t("profile.verified") }}</BaseBadge>
            <BaseBadge v-else-if="verificationStatus === 'pending'" variant="warning">Under Review</BaseBadge>
            <BaseBadge v-else variant="danger">{{ t("profile.not_verified") }}</BaseBadge>
          </div>

          <div v-if="error" class="p-3 rounded-lg bg-danger/10 text-danger text-sm">{{ error }}</div>
          <div v-if="success" class="p-3 rounded-lg bg-success/10 text-success text-sm">{{ success }}</div>

          <!-- Info -->
          <div class="bg-surface rounded-lg p-4 text-sm text-muted space-y-1">
            <p>To verify your identity, upload a clear photo or scan of one of the following:</p>
            <ul class="list-disc list-inside ml-2 space-y-0.5">
              <li>Government-issued ID card</li>
              <li>Passport</li>
              <li>Driver's license</li>
            </ul>
            <p class="text-xs text-muted/70 mt-2">Your document will be reviewed by our team within 24-48 hours.</p>
          </div>

          <!-- Upload -->
          <div v-if="verificationStatus !== 'verified'">
            <label class="block text-sm font-medium text-heading mb-1.5">{{ t("profile.upload_id") }}</label>
            <div class="flex items-center gap-3">
              <input
                type="file"
                accept="image/*,.pdf"
                class="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-navy-700 file:text-white hover:file:bg-navy-800 file:cursor-pointer"
                @change="handleFileChange"
              />
            </div>
            <p v-if="identityFile" class="text-xs text-muted mt-2">Selected: {{ identityFile.name }}</p>

            <BaseButton
              variant="primary"
              :loading="uploading"
              :disabled="!identityFile"
              class="mt-4"
              @click="handleUpload"
            >
              {{ t("profile.upload_id") }}
            </BaseButton>
          </div>

          <div v-else class="text-center py-4">
            <p class="text-success text-sm font-medium">Your identity has been verified. Thank you!</p>
          </div>
        </div>
      </BaseCard>
    </div>
  </UserLayout>
</template>
