import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";

export function usePermission() {
  const authStore = useAuthStore();

  function can(action, resource) {
    return authStore.hasPermission(action, resource);
  }

  function cannot(action, resource) {
    return !can(action, resource);
  }

  const isSuperAdmin = computed(() => authStore.isSuperAdmin);
  const isAuctioneer = computed(() => authStore.isAuctioneer);
  const isEscrowManager = computed(() => authStore.isEscrowManager);

  return {
    can,
    cannot,
    isSuperAdmin,
    isAuctioneer,
    isEscrowManager,
    canManageRoles: computed(() => can("manage", "roles")),
    canManageUsers: computed(() => can("update", "users")),
    canApproveListings: computed(() => can("approve", "listings")),
    canManageAuctions: computed(() => can("create", "auctions")),
    canManageEscrow: computed(() => can("release", "escrow")),
    canManageDisputes: computed(() => can("manage", "disputes")),
    canReadLogs: computed(() => can("read", "logs")),
    canReadAnalytics: computed(() => can("read", "analytics")),
    canManageCms: computed(() => can("manage", "cms")),
    canManageCategories: computed(() => can("manage", "categories")),
  };
}
