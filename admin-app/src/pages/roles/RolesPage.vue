<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { roleService } from "@/services/roleService";
import { usePermission } from "@/composables/usePermission";
import { useToast } from "vue-toastification";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseBadge from "@/components/base/BaseBadge.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { canManageRoles } = usePermission();

const roles = ref([]);
const loading = ref(true);
const error = ref("");
const showModal = ref(false);
const editingRole = ref(null);
const roleName = ref("");
const roleDescription = ref("");
const actionLoading = ref(false);
const deleteModal = ref(false);
const roleToDelete = ref(null);

async function fetchRoles() {
  loading.value = true;
  error.value = "";
  try {
    roles.value = await roleService.getRoles();
  } catch (e) {
    error.value = e.message || "Failed to load roles";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchRoles);

function openCreateModal() {
  editingRole.value = null;
  roleName.value = "";
  roleDescription.value = "";
  showModal.value = true;
}

function openEditModal(role) {
  editingRole.value = role;
  roleName.value = role.name;
  roleDescription.value = role.description || "";
  showModal.value = true;
}

async function saveRole() {
  if (!roleName.value.trim()) return;
  actionLoading.value = true;
  try {
    if (editingRole.value) {
      await roleService.updateRole(editingRole.value.id, { name: roleName.value, description: roleDescription.value });
      toast.success("Role updated");
    } else {
      await roleService.createRole({ name: roleName.value, description: roleDescription.value });
      toast.success("Role created");
    }
    showModal.value = false;
    await fetchRoles();
  } catch (e) {
    toast.error(e.message || "Failed to save role");
  } finally {
    actionLoading.value = false;
  }
}

function confirmDelete(role) {
  roleToDelete.value = role;
  deleteModal.value = true;
}

async function deleteRole() {
  actionLoading.value = true;
  try {
    await roleService.deleteRole(roleToDelete.value.id);
    toast.success("Role deleted");
    deleteModal.value = false;
    await fetchRoles();
  } catch (e) {
    toast.error(e.message || "Failed to delete role");
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
          <h1 class="text-2xl font-bold text-heading">{{ t("admin.roles") }}</h1>
          <p class="text-muted mt-1">Manage roles and permissions</p>
        </div>
        <BaseButton v-if="canManageRoles" @click="openCreateModal">{{ t("common.add") }} Role</BaseButton>
      </div>

      <div v-if="loading" class="space-y-3">
        <BaseCard v-for="i in 4" :key="i"><BaseSkeleton :rows="2" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <div v-else-if="roles.length === 0">
        <BaseEmptyState title="No roles found" description="Create your first role to get started" />
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <BaseCard v-for="role in roles" :key="role.id">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="font-semibold text-heading">{{ role.name }}</h3>
              <p class="text-xs text-muted mt-1">{{ role.description || "No description" }}</p>
            </div>
            <BaseBadge v-if="role.is_system" variant="info">System</BaseBadge>
          </div>
          <div class="flex gap-2 mt-4">
            <BaseButton variant="ghost" size="sm" @click="router.push(`/admin/roles/${role.id}/permissions`)">
              {{ t("common.edit") }} Permissions
            </BaseButton>
            <BaseButton v-if="canManageRoles && !role.is_system" variant="ghost" size="sm" @click="openEditModal(role)">
              {{ t("common.edit") }}
            </BaseButton>
            <BaseButton v-if="canManageRoles && !role.is_system" variant="danger" size="sm" @click="confirmDelete(role)">
              {{ t("common.delete") }}
            </BaseButton>
          </div>
        </BaseCard>
      </div>

      <BaseModal :open="showModal" :title="editingRole ? 'Edit Role' : 'Create Role'" @close="showModal = false">
        <div class="space-y-4">
          <BaseInput v-model="roleName" label="Role Name" placeholder="e.g. moderator" required />
          <BaseInput v-model="roleDescription" label="Description" placeholder="Optional description" />
        </div>
        <template #footer>
          <div class="flex justify-end gap-3">
            <BaseButton variant="secondary" @click="showModal = false">{{ t("common.cancel") }}</BaseButton>
            <BaseButton :loading="actionLoading" @click="saveRole">{{ t("common.save") }}</BaseButton>
          </div>
        </template>
      </BaseModal>

      <BaseModal :open="deleteModal" title="Delete Role" @close="deleteModal = false">
        <p class="text-sm text-muted">Are you sure you want to delete the role "{{ roleToDelete?.name }}"? This action cannot be undone.</p>
        <template #footer>
          <div class="flex justify-end gap-3">
            <BaseButton variant="secondary" @click="deleteModal = false">{{ t("common.cancel") }}</BaseButton>
            <BaseButton variant="danger" :loading="actionLoading" @click="deleteRole">{{ t("common.delete") }}</BaseButton>
          </div>
        </template>
      </BaseModal>
    </div>
  </AdminLayout>
</template>
