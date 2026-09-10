<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { roleService } from "@/services/roleService";
import { useToast } from "vue-toastification";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseBadge from "@/components/base/BaseBadge.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const role = ref(null);
const allPermissions = ref([]);
const loading = ref(true);
const error = ref("");
const actionLoading = ref(false);

async function fetchData() {
  loading.value = true;
  error.value = "";
  try {
    const [roleData, permissions] = await Promise.all([
      roleService.getRoleById(route.params.id),
      roleService.getPermissions(),
    ]);
    role.value = roleData;
    allPermissions.value = permissions;
  } catch (e) {
    error.value = e.message || "Failed to load role permissions";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);

function hasPermission(permissionId) {
  return role.value?.role_permissions?.some((rp) => rp.permission_id === permissionId) || false;
}

async function togglePermission(permissionId) {
  actionLoading.value = true;
  try {
    if (hasPermission(permissionId)) {
      await roleService.revokePermission(route.params.id, permissionId);
    } else {
      await roleService.assignPermission(route.params.id, permissionId);
    }
    await fetchData();
    toast.success("Permission updated");
  } catch (e) {
    toast.error(e.message || "Failed to update permission");
  } finally {
    actionLoading.value = false;
  }
}

const groupedPermissions = (resource) => allPermissions.value.filter((p) => p.resource === resource);
const resources = () => [...new Set(allPermissions.value.map((p) => p.resource))];
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center gap-4">
        <button class="text-muted hover:text-heading" @click="router.back()">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 class="text-2xl font-bold text-heading">Permissions: {{ role?.name }}</h1>
          <p class="text-muted mt-1">Toggle permissions for this role</p>
        </div>
      </div>

      <div v-if="loading" class="space-y-4">
        <BaseCard v-for="i in 3" :key="i"><BaseSkeleton :rows="4" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <template v-else>
        <BaseCard v-for="resource in resources()" :key="resource">
          <h3 class="font-semibold text-heading mb-4 capitalize">{{ resource }}</h3>
          <div class="space-y-3">
            <div
              v-for="perm in groupedPermissions(resource)"
              :key="perm.id"
              class="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div>
                <p class="text-sm font-medium text-heading">{{ perm.action }}</p>
                <p class="text-xs text-muted">{{ perm.resource }}.{{ perm.action }}</p>
              </div>
              <button
                :class="[
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2',
                  hasPermission(perm.id) ? 'bg-navy-700' : 'bg-gray-200',
                ]"
                :disabled="actionLoading"
                @click="togglePermission(perm.id)"
              >
                <span
                  :class="[
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    hasPermission(perm.id) ? 'translate-x-5' : 'translate-x-0',
                  ]"
                />
              </button>
            </div>
          </div>
        </BaseCard>
      </template>
    </div>
  </AdminLayout>
</template>
