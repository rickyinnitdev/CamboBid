import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";

export function useAuth() {
  const authStore = useAuthStore();

  const user = computed(() => authStore.user);
  const profile = computed(() => authStore.profile);
  const loading = computed(() => authStore.loading);
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const isAdmin = computed(() => authStore.isAdmin);
  const isSuperAdmin = computed(() => authStore.isSuperAdmin);
  const isAuctioneer = computed(() => authStore.isAuctioneer);
  const isEscrowManager = computed(() => authStore.isEscrowManager);
  const userRole = computed(() => authStore.userRole);

  function hasPermission(action, resource) {
    return authStore.hasPermission(action, resource);
  }

  return {
    user, profile, loading, isAuthenticated,
    isAdmin, isSuperAdmin, isAuctioneer, isEscrowManager, userRole,
    hasPermission,
    login: authStore.login,
    logout: authStore.logout,
    refreshProfile: authStore.refreshProfile,
  };
}
