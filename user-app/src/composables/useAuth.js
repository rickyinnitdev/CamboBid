import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";

export function useAuth() {
  const authStore = useAuthStore();

  const user = computed(() => authStore.user);
  const profile = computed(() => authStore.profile);
  const loading = computed(() => authStore.loading);
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const isVerified = computed(() => authStore.isVerified);
  const isSuspended = computed(() => authStore.isSuspended);
  const isAdmin = computed(() => authStore.isAdmin);
  const isAuctioneer = computed(() => authStore.isAuctioneer);
  const isVerifiedBidder = computed(() => authStore.isVerifiedBidder);
  const isEscrowManager = computed(() => authStore.isEscrowManager);
  const userRole = computed(() => authStore.userRole);

  function hasPermission(action, resource) {
    return authStore.hasPermission(action, resource);
  }

  return {
    user,
    profile,
    loading,
    isAuthenticated,
    isVerified,
    isSuspended,
    isAdmin,
    isAuctioneer,
    isVerifiedBidder,
    isEscrowManager,
    userRole,
    hasPermission,
    register: authStore.register,
    login: authStore.login,
    loginWithGoogle: authStore.loginWithGoogle,
    logout: authStore.logout,
    refreshProfile: authStore.refreshProfile,
    updateProfile: authStore.updateProfile,
  };
}
