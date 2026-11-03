<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useAuth } from "@/composables/useAuth";
import { authService } from "@/services/authService";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseBadge from "@/components/base/BaseBadge.vue";

const { t } = useI18n();
const { user, profile, refreshProfile, updateProfile } = useAuth();

const displayName = ref("");
const bio = ref("");
const phone = ref("");
const location = ref("");
const avatarFile = ref(null);
const avatarPreview = ref(null);
const saving = ref(false);
const error = ref("");
const success = ref("");

onMounted(async () => {
  if (profile.value) {
    displayName.value = profile.value.display_name || "";
    bio.value = profile.value.bio || "";
    phone.value = profile.value.phone || "";
    location.value = profile.value.location || "";
    avatarPreview.value = profile.value.avatar_url || user.value?.user_metadata?.avatar_url || user.value?.user_metadata?.picture || null;
  }
});

function handleAvatarChange(e) {
  const file = e.target.files?.[0];
  if (file) {
    avatarFile.value = file;
    avatarPreview.value = URL.createObjectURL(file);
  }
}

async function handleSave() {
  saving.value = true;
  error.value = "";
  success.value = "";
  try {
    if (avatarFile.value && user.value) {
      await authService.uploadAvatar(user.value.id, avatarFile.value);
    }
    await updateProfile({
      display_name: displayName.value,
      bio: bio.value,
      phone: phone.value,
      location: location.value,
    });
    await refreshProfile();
    success.value = "Profile updated successfully.";
  } catch (err) {
    error.value = err.message || "Failed to update profile.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UserLayout>
    <main class="page-container max-w-5xl">
      <div class="page-header">
        <div>
          <p class="kicker">Account</p>
          <h1 class="page-title mt-3">{{ t("profile.title") }}</h1>
          <p class="page-subtitle mt-3">
            Manage your profile, contact details and bidder identity.
          </p>
        </div>
        <router-link to="/account/security" class="btn-outline btn-sm self-start sm:self-auto">
          Account security
        </router-link>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1fr_320px]">
        <BaseCard padded>
          <div
            v-if="error"
            role="alert"
            class="mb-5 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger"
          >
            {{ error }}
          </div>
          <div
            v-if="success"
            role="status"
            class="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {{ success }}
          </div>

          <div class="flex items-center gap-5 border-b border-border pb-6">
            <div class="relative shrink-0">
              <img
                v-if="avatarPreview"
                :src="avatarPreview"
                alt="Your profile photo"
                class="h-20 w-20 rounded-2xl object-cover ring-1 ring-border"
              />
              <div
                v-else
                class="grid h-20 w-20 place-items-center rounded-2xl bg-navy-900"
              >
                <span class="font-display text-2xl font-semibold text-white">
                  {{ (displayName || "U").charAt(0).toUpperCase() }}
                </span>
              </div>
              <label
                class="absolute -bottom-1.5 -right-1.5 grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-border bg-white text-muted shadow-sm transition-colors hover:bg-surface hover:text-heading"
                aria-label="Change profile photo"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input type="file" accept="image/*" class="sr-only" @change="handleAvatarChange" />
              </label>
            </div>
            <div class="min-w-0">
              <h2 class="truncate font-display text-lg font-semibold text-heading">
                {{ profile?.display_name || "Your profile" }}
              </h2>
              <p class="mt-1 truncate text-sm text-body">{{ profile?.email }}</p>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <BaseBadge v-if="profile?.identity_verified" variant="success" size="sm">
                  {{ t("profile.verified") }}
                </BaseBadge>
                <BaseBadge v-else variant="warning" size="sm">
                  {{ t("profile.not_verified") }}
                </BaseBadge>
                <BaseBadge v-if="profile?.deposit_paid" variant="info" size="sm">
                  {{ t("profile.deposit_paid") }}
                </BaseBadge>
                <BaseBadge v-if="profile?.demo_verification" variant="warning" size="sm">
                  Demo verification
                </BaseBadge>
              </div>
            </div>
          </div>

          <form class="mt-6 space-y-4" @submit.prevent="handleSave">
            <BaseInput v-model="displayName" :label="t('profile.display_name')" autocomplete="name" required />

            <div class="grid gap-4 sm:grid-cols-2">
              <BaseInput v-model="phone" :label="t('profile.phone')" type="tel" autocomplete="tel" />
              <BaseInput v-model="location" :label="t('profile.location')" autocomplete="address-level2" />
            </div>

            <div>
              <label for="profile-bio" class="label">{{ t("profile.bio") }}</label>
              <textarea
                id="profile-bio"
                v-model="bio"
                rows="4"
                class="input resize-none"
                placeholder="Tell buyers and sellers a little about yourself."
              />
            </div>

            <div class="flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <BaseButton type="submit" variant="primary" :loading="saving">
                {{ t("profile.save") }}
              </BaseButton>
              <router-link
                to="/verify-identity"
                class="text-sm font-semibold text-navy-700 transition-colors hover:text-navy-900"
              >
                {{ t("profile.identity_status") }} &rarr;
              </router-link>
            </div>
          </form>
        </BaseCard>

        <aside class="space-y-4">
          <BaseCard padded>
            <h2 class="font-display text-base font-semibold text-heading">
              Account status
            </h2>
            <dl class="mt-4 space-y-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <dt class="text-body">Identity</dt>
                <dd>
                  <BaseBadge :variant="profile?.identity_verified ? 'success' : 'warning'" size="sm">
                    {{ profile?.identity_verified ? t("profile.verified") : t("profile.not_verified") }}
                  </BaseBadge>
                </dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-body">Bidder deposit</dt>
                <dd>
                  <BaseBadge :variant="profile?.deposit_paid ? 'success' : 'default'" size="sm">
                    {{ profile?.deposit_paid ? "Paid" : "Not paid" }}
                  </BaseBadge>
                </dd>
              </div>
            </dl>
            <router-link
              to="/verify-identity"
              class="mt-5 inline-flex text-sm font-semibold text-navy-700 hover:text-navy-900"
            >
              Review verification &rarr;
            </router-link>
          </BaseCard>

          <BaseCard padded>
            <h2 class="font-display text-base font-semibold text-heading">
              Quick links
            </h2>
            <nav class="mt-3 divide-y divide-border text-sm" aria-label="Account shortcuts">
              <router-link to="/profile/bids" class="flex items-center justify-between py-3 text-body transition-colors hover:text-heading">
                Bid history <span aria-hidden="true" class="text-muted">&rarr;</span>
              </router-link>
              <router-link to="/orders" class="flex items-center justify-between py-3 text-body transition-colors hover:text-heading">
                Wins &amp; purchases <span aria-hidden="true" class="text-muted">&rarr;</span>
              </router-link>
              <router-link to="/wallet" class="flex items-center justify-between py-3 text-body transition-colors hover:text-heading">
                Wallet <span aria-hidden="true" class="text-muted">&rarr;</span>
              </router-link>
              <router-link to="/documents" class="flex items-center justify-between py-3 text-body transition-colors hover:text-heading">
                Invoices &amp; receipts <span aria-hidden="true" class="text-muted">&rarr;</span>
              </router-link>
            </nav>
          </BaseCard>
        </aside>
      </div>
    </main>
  </UserLayout>
</template>
