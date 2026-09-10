<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { supabase } from "@/services/supabase";
import { usePermission } from "@/composables/usePermission";
import { useToast } from "vue-toastification";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();
const toast = useToast();
const { canManageCategories } = usePermission();

const categories = ref([]);
const loading = ref(true);
const error = ref("");
const showModal = ref(false);
const editingCategory = ref(null);
const categoryName = ref("");
const categorySlug = ref("");
const actionLoading = ref(false);
const deleteModal = ref(false);
const categoryToDelete = ref(null);

async function fetchCategories() {
  loading.value = true;
  error.value = "";
  try {
    const { data, error: err } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    if (err) throw err;
    categories.value = data || [];
  } catch (e) {
    error.value = e.message || "Failed to load categories";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchCategories);

function openCreateModal() {
  editingCategory.value = null;
  categoryName.value = "";
  categorySlug.value = "";
  showModal.value = true;
}

function openEditModal(category) {
  editingCategory.value = category;
  categoryName.value = category.name;
  categorySlug.value = category.slug;
  showModal.value = true;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function saveCategory() {
  if (!categoryName.value.trim()) return;
  actionLoading.value = true;
  try {
    const slug = categorySlug.value || slugify(categoryName.value);
    if (editingCategory.value) {
      const { error: err } = await supabase
        .from("categories")
        .update({ name: categoryName.value, slug })
        .eq("id", editingCategory.value.id);
      if (err) throw err;
      toast.success("Category updated");
    } else {
      const { error: err } = await supabase
        .from("categories")
        .insert({ name: categoryName.value, slug });
      if (err) throw err;
      toast.success("Category created");
    }
    showModal.value = false;
    await fetchCategories();
  } catch (e) {
    toast.error(e.message || "Failed to save category");
  } finally {
    actionLoading.value = false;
  }
}

function confirmDelete(category) {
  categoryToDelete.value = category;
  deleteModal.value = true;
}

async function deleteCategory() {
  actionLoading.value = true;
  try {
    const { error: err } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryToDelete.value.id);
    if (err) throw err;
    toast.success("Category deleted");
    deleteModal.value = false;
    await fetchCategories();
  } catch (e) {
    toast.error(e.message || "Failed to delete category");
  } finally {
    actionLoading.value = false;
  }
}
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-heading">{{ t("admin.categories") }}</h1>
          <p class="text-muted mt-1">Manage auction categories</p>
        </div>
        <BaseButton v-if="canManageCategories" @click="openCreateModal">{{ t("common.add") }} Category</BaseButton>
      </div>

      <div v-if="loading" class="space-y-3">
        <BaseCard v-for="i in 5" :key="i"><BaseSkeleton :rows="1" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <div v-else-if="categories.length === 0">
        <BaseEmptyState title="No categories found" description="Create your first category" />
      </div>

      <div v-else>
        <BaseCard padding="none">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-surface">
                  <th class="px-4 py-3 text-left font-medium text-muted">Name</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Slug</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Created</th>
                  <th class="px-4 py-3 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="category in categories" :key="category.id" class="border-b border-border last:border-0 hover:bg-surface/50">
                  <td class="px-4 py-3 font-medium text-heading">{{ category.name }}</td>
                  <td class="px-4 py-3">
                    <span class="font-mono text-xs text-muted bg-surface px-2 py-1 rounded">{{ category.slug }}</span>
                  </td>
                  <td class="px-4 py-3 text-muted">{{ new Date(category.created_at).toLocaleDateString() }}</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex gap-1 justify-end">
                      <BaseButton v-if="canManageCategories" variant="ghost" size="sm" @click="openEditModal(category)">
                        {{ t("common.edit") }}
                      </BaseButton>
                      <BaseButton v-if="canManageCategories" variant="ghost" size="sm" @click="confirmDelete(category)">
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

      <BaseModal :open="showModal" :title="editingCategory ? 'Edit Category' : 'Create Category'" @close="showModal = false">
        <div class="space-y-4">
          <BaseInput v-model="categoryName" label="Category Name" placeholder="e.g. Electronics" required />
          <BaseInput v-model="categorySlug" label="Slug (auto-generated)" placeholder="electronics" />
        </div>
        <template #footer>
          <div class="flex justify-end gap-3">
            <BaseButton variant="secondary" @click="showModal = false">{{ t("common.cancel") }}</BaseButton>
            <BaseButton :loading="actionLoading" @click="saveCategory">{{ t("common.save") }}</BaseButton>
          </div>
        </template>
      </BaseModal>

      <BaseModal :open="deleteModal" title="Delete Category" @close="deleteModal = false">
        <p class="text-sm text-muted">Are you sure you want to delete "{{ categoryToDelete?.name }}"? This action cannot be undone.</p>
        <template #footer>
          <div class="flex justify-end gap-3">
            <BaseButton variant="secondary" @click="deleteModal = false">{{ t("common.cancel") }}</BaseButton>
            <BaseButton variant="danger" :loading="actionLoading" @click="deleteCategory">{{ t("common.delete") }}</BaseButton>
          </div>
        </template>
      </BaseModal>
    </div>
  </AdminLayout>
</template>
