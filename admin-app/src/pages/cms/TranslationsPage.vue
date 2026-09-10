<script setup>
import { ref, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { translationService } from "@/services/translationService";
import { useAuth } from "@/composables/useAuth";
import { useToast } from "vue-toastification";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();
const toast = useToast();
const { user } = useAuth();

const translations = ref([]);
const locales = ref([]);
const loading = ref(true);
const error = ref("");
const selectedLocale = ref("en");
const prefixFilter = ref("");
const editingId = ref(null);
const editingValue = ref("");
const addingNew = ref(false);
const newKey = ref("");
const newValue = ref("");
const actionLoading = ref(false);

async function fetchTranslations() {
  loading.value = true;
  error.value = "";
  try {
    translations.value = await translationService.getTranslations(
      selectedLocale.value,
      prefixFilter.value || undefined
    );
  } catch (e) {
    error.value = e.message || "Failed to load translations";
  } finally {
    loading.value = false;
  }
}

async function fetchLocales() {
  try {
    locales.value = await translationService.getLocales();
  } catch (e) {
    console.error("Failed to load locales:", e);
  }
}

onMounted(() => {
  fetchTranslations();
  fetchLocales();
});

watch(selectedLocale, fetchTranslations);

let prefixTimeout = null;
watch(prefixFilter, () => {
  clearTimeout(prefixTimeout);
  prefixTimeout = setTimeout(fetchTranslations, 300);
});

function startEditing(translation) {
  editingId.value = translation.id;
  editingValue.value = translation.value;
}

function cancelEditing() {
  editingId.value = null;
  editingValue.value = "";
}

async function saveTranslation(translation) {
  actionLoading.value = true;
  try {
    await translationService.updateTranslation(translation.id, editingValue.value, user.value.id);
    toast.success("Translation updated");
    cancelEditing();
    await fetchTranslations();
  } catch (e) {
    toast.error(e.message || "Failed to update translation");
  } finally {
    actionLoading.value = false;
  }
}

async function addTranslation() {
  if (!newKey.value.trim() || !newValue.value.trim()) return;
  actionLoading.value = true;
  try {
    await translationService.addTranslation(selectedLocale.value, newKey.value, newValue.value);
    toast.success("Translation added");
    addingNew.value = false;
    newKey.value = "";
    newValue.value = "";
    await fetchTranslations();
  } catch (e) {
    toast.error(e.message || "Failed to add translation");
  } finally {
    actionLoading.value = false;
  }
}

async function deleteTranslation(id) {
  actionLoading.value = true;
  try {
    await translationService.deleteTranslation(id);
    toast.success("Translation deleted");
    await fetchTranslations();
  } catch (e) {
    toast.error(e.message || "Failed to delete translation");
  } finally {
    actionLoading.value = false;
  }
}

async function exportLocale() {
  try {
    const json = await translationService.exportLocale(selectedLocale.value);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedLocale.value}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Export failed:", e);
  }
}
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-heading">{{ t("admin.cms") }}</h1>
          <p class="text-muted mt-1">Manage translations and content</p>
        </div>
        <div class="flex gap-2">
          <BaseButton variant="secondary" @click="exportLocale">{{ t("admin.export_csv") }}</BaseButton>
          <BaseButton @click="addingNew = true">{{ t("common.add") }}</BaseButton>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <select v-model="selectedLocale" class="px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500">
          <option v-for="locale in locales" :key="locale" :value="locale">{{ locale.toUpperCase() }}</option>
        </select>
        <div class="flex-1">
          <BaseInput v-model="prefixFilter" placeholder="Filter by key prefix..." type="search" />
        </div>
      </div>

      <BaseCard v-if="addingNew" padding="md">
        <h3 class="font-semibold text-heading mb-3">Add Translation</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BaseInput v-model="newKey" label="Key" placeholder="e.g. home.title" />
          <BaseInput v-model="newValue" label="Value" placeholder="Translation text" />
        </div>
        <div class="flex gap-2 mt-3">
          <BaseButton :loading="actionLoading" @click="addTranslation">{{ t("common.save") }}</BaseButton>
          <BaseButton variant="secondary" @click="addingNew = false">{{ t("common.cancel") }}</BaseButton>
        </div>
      </BaseCard>

      <div v-if="loading" class="space-y-3">
        <BaseCard v-for="i in 5" :key="i"><BaseSkeleton :rows="2" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <div v-else-if="translations.length === 0">
        <BaseEmptyState title="No translations found" description="Add your first translation" />
      </div>

      <div v-else>
        <BaseCard padding="none">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-surface">
                  <th class="px-4 py-3 text-left font-medium text-muted">Key</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Value</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Updated</th>
                  <th class="px-4 py-3 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="translation in translations" :key="translation.id" class="border-b border-border last:border-0 hover:bg-surface/50">
                  <td class="px-4 py-3">
                    <span class="font-mono text-xs text-heading bg-surface px-2 py-1 rounded">{{ translation.key }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <template v-if="editingId === translation.id">
                      <div class="flex gap-2">
                        <input
                          v-model="editingValue"
                          class="flex-1 px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                          @keyup.enter="saveTranslation(translation)"
                          @keyup.escape="cancelEditing"
                        />
                        <BaseButton size="sm" :loading="actionLoading" @click="saveTranslation(translation)">Save</BaseButton>
                        <BaseButton size="sm" variant="secondary" @click="cancelEditing">Cancel</BaseButton>
                      </div>
                    </template>
                    <template v-else>
                      <span class="text-heading">{{ translation.value || "(empty)" }}</span>
                    </template>
                  </td>
                  <td class="px-4 py-3 text-muted text-xs">{{ translation.updated_at ? new Date(translation.updated_at).toLocaleDateString() : "Never" }}</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex gap-1 justify-end">
                      <BaseButton v-if="editingId !== translation.id" variant="ghost" size="sm" @click="startEditing(translation)">
                        {{ t("common.edit") }}
                      </BaseButton>
                      <BaseButton variant="ghost" size="sm" @click="deleteTranslation(translation.id)">
                        {{ t("common.delete") }}
                      </BaseButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </BaseCard>
      </div>
    </div>
  </AdminLayout>
</template>
