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
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const success = ref("");

onMounted(async () => {
  if (profile.value) {
    displayName.value = profile.value.display_name || "";
    bio.value = profile.value.bio || "";
    phone.value = profile.value.phone || "";
    location.value = profile.value.location || "";
    avatarPreview.value = profile.value.avatar_url || null;
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
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 class="text-2xl font-bold text-heading mb-8">{{ t("profile.title") }}</h1>

      <BaseCard>
        <div class="p-6">
          <div v-if="error" class="p-3 rounded-lg bg-danger/10 text-danger text-sm mb-4">{{ error }}</div>
          <div v-if="success" class="p-3 rounded-lg bg-success/10 text-success text-sm mb-4">{{ success }}</div>

          <!-- Avatar -->
          <div class="flex items-center gap-6 mb-8">
            <div class="relative">
              <img
                v-if="avatarPreview"
                :src="avatarPreview"
                alt="Avatar"
                class="w-20 h-20 rounded-full object-cover"
              />
              <div v-else class="w-20 h-20 rounded-full bg-navy-700 flex items-center justify-center">
                <span class="text-2xl font-bold text-white">
                  {{ (displayName || "U").charAt(0).toUpperCase() }}
                </span>
              </div>
              <label class="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full border border-border shadow-sm flex items-center justify-center cursor-pointer hover:bg-surface">
                <svg class="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input type="file" accept="image/*" class="hidden" @change="handleAvatarChange" />
              </label>
            </div>
            <div>
              <h3 class="font-semibold text-heading">{{ profile?.display_name }}</h3>
              <p class="text-sm text-muted">{{ profile?.email }}</p>
              <div class="flex items-center gap-2 mt-1">
                <BaseBadge v-if="profile?.identity_verified" variant="success" size="sm">
                  {{ t("profile.verified") }}
                </BaseBadge>
                <BaseBadge v-else variant="warning" size="sm">
                  {{ t("profile.not_verified") }}
                </BaseBadge>
                <BaseBadge v-if="profile?.deposit_paid" variant="info" size="sm">
                  {{ t("profile.deposit_paid") }}
                </BaseBadge>
              </div>
            </div>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSave" class="space-y-4">
            <BaseInput v-model="displayName" :label="t('profile.display_name')" required />
            <BaseInput v-model="phone" :label="t('profile.phone')" type="tel" />
            <BaseInput v-model="location" :label="t('profile.location')" />
            <div>
              <label class="block text-sm font-medium text-heading mb-1.5">{{ t("profile.bio") }}</label>
              <textarea
                v-model="bio"
                rows="3"
                class="block w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 transition-colors resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div class="flex items-center gap-3 pt-2">
              <BaseButton type="submit" variant="primary" :loading="saving">
                {{ t("profile.save") }}
              </BaseButton>
              <router-link to="/verify-identity" class="text-sm font-medium text-navy-700 hover:text-navy-800">
                {{ t("profile.identity_status") }} &rarr;
              </router-link>
            </div>
          </form>
        </div>
      </BaseCard>
    </div>
  </UserLayout>
</template>
