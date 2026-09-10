<script setup>
import { ref, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { userService } from "@/services/userService";
import { usePermission } from "@/composables/usePermission";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseBadge from "@/components/base/BaseBadge.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();
const router = useRouter();
const { canManageUsers } = usePermission();

const users = ref([]);
const total = ref(0);
const page = ref(1);
const limit = 20;
const search = ref("");
const roleFilter = ref("");
const loading = ref(true);
const error = ref("");

async function fetchUsers() {
  loading.value = true;
  error.value = "";
  try {
    const params = { page: page.value, limit };
    if (search.value) params.search = search.value;
    if (roleFilter.value) params.role = roleFilter.value;
    const result = await userService.getUsers(params);
    users.value = result.users;
    total.value = result.total;
  } catch (e) {
    error.value = e.message || "Failed to load users";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchUsers);

let searchTimeout = null;
watch(search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { page.value = 1; fetchUsers(); }, 300);
});

watch(roleFilter, () => { page.value = 1; fetchUsers(); });

function totalPages() { return Math.ceil(total.value / limit); }

function roleBadgeVariant(role) {
  const map = { super_admin: "danger", auctioneer: "purple", escrow_manager: "info", verified_bidder: "success", casual_visitor: "default" };
  return map[role] || "default";
}
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-heading">{{ t("admin.users") }}</h1>
          <p class="text-muted mt-1">Manage platform users</p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex-1">
          <BaseInput v-model="search" :placeholder="t('common.search') + '...'" type="search" />
        </div>
        <select v-model="roleFilter" class="px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500">
          <option value="">{{ t("common.all") }} Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="auctioneer">Auctioneer</option>
          <option value="escrow_manager">Escrow Manager</option>
          <option value="verified_bidder">Verified Bidder</option>
          <option value="casual_visitor">Casual Visitor</option>
        </select>
      </div>

      <div v-if="loading" class="space-y-3">
        <BaseCard v-for="i in 5" :key="i"><BaseSkeleton :rows="2" /></BaseCard>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{{ error }}</div>

      <div v-else-if="users.length === 0">
        <BaseEmptyState title="No users found" description="Try adjusting your filters" />
      </div>

      <div v-else>
        <BaseCard padding="none">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-surface">
                  <th class="px-4 py-3 text-left font-medium text-muted">User</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Role</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Status</th>
                  <th class="px-4 py-3 text-left font-medium text-muted">Joined</th>
                  <th class="px-4 py-3 text-right font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in users" :key="user.id" class="border-b border-border last:border-0 hover:bg-surface/50">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center">
                        <span class="text-xs font-semibold text-white">{{ (user.display_name || "U").charAt(0).toUpperCase() }}</span>
                      </div>
                      <div>
                        <p class="font-medium text-heading">{{ user.display_name || "Unnamed" }}</p>
                        <p class="text-xs text-muted">{{ user.email }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <BaseBadge :variant="roleBadgeVariant(user.role)">{{ user.role?.replace("_", " ") }}</BaseBadge>
                  </td>
                  <td class="px-4 py-3">
                    <BaseBadge :variant="user.suspended ? 'danger' : 'success'">{{ user.suspended ? 'Suspended' : 'Active' }}</BaseBadge>
                  </td>
                  <td class="px-4 py-3 text-muted">{{ new Date(user.created_at).toLocaleDateString() }}</td>
                  <td class="px-4 py-3 text-right">
                    <BaseButton v-if="canManageUsers" variant="ghost" size="sm" @click="router.push(`/admin/bidders/${user.id}`)">
                      {{ t("common.view") }}
                    </BaseButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </BaseCard>

        <div v-if="totalPages() > 1" class="flex items-center justify-between mt-4">
          <p class="text-sm text-muted">Showing {{ (page - 1) * limit + 1 }}-{{ Math.min(page * limit, total) }} of {{ total }}</p>
          <div class="flex gap-2">
            <BaseButton variant="secondary" size="sm" :disabled="page <= 1" @click="page--; fetchUsers()">{{ t("common.previous") }}</BaseButton>
            <BaseButton variant="secondary" size="sm" :disabled="page >= totalPages()" @click="page++; fetchUsers()">{{ t("common.next") }}</BaseButton>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
