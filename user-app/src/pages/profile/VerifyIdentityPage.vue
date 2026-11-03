<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAuth } from "@/composables/useAuth";
import { authService } from "@/services/authService";
import UserLayout from "@/components/layout/UserLayout.vue";
import KhmerDivider from "@/components/base/KhmerDivider.vue";
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
  if (profile.value?.identity_status === "pending") return "pending";
  if (profile.value?.identity_status === "rejected") return "rejected";
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
    <main class="page-container max-w-4xl">
      <KhmerDivider class="mb-6" />
      <div class="page-header">
        <div>
          <p class="kicker">Account</p>
          <h1 class="page-title mt-3">{{ t("profile.identity_status") }}</h1>
          <p class="page-subtitle mt-3">
            Upload a sample document for manual review. This is a university
            demonstration and does not verify government records.
          </p>
        </div>
        <router-link to="/account/security" class="btn-outline btn-sm self-start sm:self-auto">
          Account security
        </router-link>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div class="space-y-4">
          <div
            v-if="profile?.identity_rejection_reason"
            role="alert"
            class="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger"
          >
            Review feedback: {{ profile.identity_rejection_reason }}
          </div>

          <BaseCard padded>
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
              <div>
                <p class="text-[11px] font-medium uppercase tracking-wider text-muted">
                  Current status
                </p>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <BaseBadge
                    v-if="verificationStatus === 'verified'"
                    variant="success"
                  >
                    {{ t("profile.verified") }}
                  </BaseBadge>
                  <BaseBadge
                    v-else-if="verificationStatus === 'pending'"
                    variant="warning"
                  >
                    Under review
                  </BaseBadge>
                  <BaseBadge v-else-if="verificationStatus === 'rejected'" variant="danger">
                    Rejected
                  </BaseBadge>
                  <BaseBadge v-else variant="default">
                    {{ t("profile.not_verified") }}
                  </BaseBadge>
                  <BaseBadge
                    v-if="profile?.demo_verification"
                    variant="warning"
                  >
                    Demo verification
                  </BaseBadge>
                </div>
              </div>
              <router-link
                to="/account/security"
                class="text-sm font-semibold text-navy-700 hover:text-navy-900"
              >
                Confirm email &amp; 2FA &rarr;
              </router-link>
            </div>

            <div
              v-if="error"
              role="alert"
              class="mt-5 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger"
            >
              {{ error }}
            </div>
            <div
              v-if="success"
              role="status"
              class="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              {{ success }}
            </div>

            <div class="mt-5 rounded-xl bg-surface p-4">
              <p class="text-sm font-semibold text-heading">
                What to upload
              </p>
              <ul class="mt-2 space-y-1.5 text-sm leading-6 text-body">
                <li class="flex gap-2">
                  <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
                  Government-issued ID card
                </li>
                <li class="flex gap-2">
                  <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
                  Passport
                </li>
                <li class="flex gap-2">
                  <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
                  Driver's licence
                </li>
              </ul>
              <p class="mt-3 text-xs leading-5 text-muted">
                An authorised reviewer will approve or reject your sample. JPG,
                PNG or PDF, up to 5 MB.
              </p>
            </div>

            <div v-if="verificationStatus !== 'verified'" class="mt-5">
              <label for="identity-document" class="label">
                {{ t("profile.upload_id") }}
              </label>
              <input
                id="identity-document"
                type="file"
                accept="image/*,.pdf"
                class="block w-full cursor-pointer rounded-lg border border-line bg-white text-sm text-body file:mr-4 file:cursor-pointer file:border-0 file:bg-navy-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                @change="handleFileChange"
              />
              <p v-if="identityFile" class="mt-2 text-xs text-muted">
                Selected: {{ identityFile.name }}
              </p>

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

            <div v-else class="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p class="text-sm font-medium text-emerald-800">
                Your identity has been verified. Thank you.
              </p>
            </div>
          </BaseCard>
        </div>

        <aside class="space-y-4">
          <BaseCard padded>
            <h2 class="font-display text-base font-semibold text-heading">
              Why verify?
            </h2>
            <ul class="mt-3 space-y-3 text-sm leading-6 text-body">
              <li>Higher bid and purchase limits may apply to verified accounts.</li>
              <li>Sellers can see that your account has passed review.</li>
              <li>Verification is required before some wallet actions.</li>
            </ul>
          </BaseCard>
          <BaseCard padded>
            <h2 class="font-display text-base font-semibold text-heading">
              Privacy
            </h2>
            <p class="mt-2 text-sm leading-6 text-body">
              Documents are visible only to authorised reviewers and are not
              shown publicly on your profile.
            </p>
            <router-link
              to="/privacy"
              class="mt-3 inline-flex text-sm font-semibold text-navy-700 hover:text-navy-900"
            >
              Read the privacy policy &rarr;
            </router-link>
          </BaseCard>
        </aside>
      </div>
    </main>
  </UserLayout>
</template>
