import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { authService } from "@/services/authService";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const profile = ref(null);
  const loading = ref(true);
  const initialized = ref(false);

  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() =>
    ["super_admin", "auctioneer", "escrow_manager"].includes(profile.value?.role)
  );
  const isSuperAdmin = computed(() => profile.value?.role === "super_admin");
  const isAuctioneer = computed(() =>
    ["super_admin", "auctioneer"].includes(profile.value?.role)
  );
  const isEscrowManager = computed(() =>
    ["super_admin", "escrow_manager"].includes(profile.value?.role)
  );
  const userRole = computed(() => profile.value?.role || "casual_visitor");

  async function initialize() {
    if (initialized.value) return;
    try {
      loading.value = true;
      const session = await authService.getSession();
      if (session?.user) {
        user.value = session.user;
        profile.value = await authService.getProfile(session.user.id);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Auth init error:", error);
      user.value = null;
      profile.value = null;
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  async function login({ email, password }) {
    const data = await authService.login({ email, password });
    user.value = data.user;
    profile.value = await authService.getProfile(data.user.id);
    return data;
  }

  async function logout() {
    await authService.logout();
    user.value = null;
    profile.value = null;
  }

  async function refreshProfile() {
    if (!user.value) return;
    try {
      profile.value = await authService.getProfile(user.value.id);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error refreshing profile:", error);
    }
  }

  function hasPermission(action, resource) {
    if (isSuperAdmin.value) return true;

    const permissionMap = {
      "users.read": ["super_admin", "auctioneer", "escrow_manager"],
      "users.update": ["super_admin"],
      "users.suspend": ["super_admin"],
      "users.verify_identity": ["super_admin", "auctioneer"],
      "roles.manage": ["super_admin"],
      "permissions.manage": ["super_admin"],
      "listings.read": ["super_admin", "auctioneer"],
      "listings.create": ["super_admin", "auctioneer"],
      "listings.update": ["super_admin", "auctioneer"],
      "listings.approve": ["super_admin", "auctioneer"],
      "auctions.read": ["super_admin", "auctioneer"],
      "auctions.create": ["super_admin", "auctioneer"],
      "auctions.update": ["super_admin", "auctioneer"],
      "auctions.close": ["super_admin", "auctioneer"],
      "bids.read": ["super_admin", "auctioneer", "escrow_manager"],
      "escrow.read": ["super_admin", "escrow_manager"],
      "escrow.release": ["super_admin", "escrow_manager"],
      "escrow.refund": ["super_admin", "escrow_manager"],
      "escrow.freeze": ["super_admin", "escrow_manager"],
      "disputes.read": ["super_admin", "auctioneer", "escrow_manager"],
      "disputes.manage": ["super_admin", "auctioneer", "escrow_manager"],
      "logs.read": ["super_admin", "auctioneer"],
      "analytics.read": ["super_admin", "auctioneer", "escrow_manager"],
      "cms.manage": ["super_admin", "auctioneer"],
      "categories.manage": ["super_admin", "auctioneer"],
    };

    const permissionKey = `${resource}.${action}`;
    const allowedRoles = permissionMap[permissionKey];
    if (!allowedRoles) return false;
    return allowedRoles.includes(userRole.value);
  }

  authService.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      user.value = session.user;
      profile.value = await authService.getProfile(session.user.id);
    } else if (event === "SIGNED_OUT") {
      user.value = null;
      profile.value = null;
    }
  });

  return {
    user, profile, loading, initialized,
    isAuthenticated, isAdmin, isSuperAdmin, isAuctioneer, isEscrowManager, userRole,
    initialize, login, logout, refreshProfile, hasPermission,
  };
});
