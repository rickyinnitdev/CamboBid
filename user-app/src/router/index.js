import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { securityService } from "@/services/securityService";

const routes = [
  {
    path: "/auth/verify",
    name: "MfaChallenge",
    component: () => import("@/pages/auth/MfaChallengePage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/documents",
    name: "Documents",
    component: () => import("@/pages/profile/DocumentsPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/documents/:id",
    name: "Document",
    component: () => import("@/pages/profile/DocumentPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/account/security",
    name: "AccountSecurity",
    component: () => import("@/pages/profile/SecurityPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/wallet",
    name: "Wallet",
    component: () => import("@/pages/profile/WalletPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/privacy",
    name: "Privacy",
    component: () => import("@/pages/legal/PolicyPage.vue"),
  },
  {
    path: "/",
    name: "Home",
    component: () => import("@/pages/HomePage.vue"),
  },
  {
    path: "/auctions",
    name: "Auctions",
    component: () => import("@/pages/auctions/AuctionsPage.vue"),
  },
  {
    path: "/auctions/calendar",
    name: "AuctionCalendar",
    component: () => import("@/pages/auctions/AuctionCalendarPage.vue"),
  },
  {
    path: "/auctions/:id",
    name: "AuctionRoom",
    component: () => import("@/pages/auctions/AuctionRoomPage.vue"),
    props: true,
  },
  {
    path: "/categories/:slug",
    name: "Category",
    component: () => import("@/pages/categories/CategoryPage.vue"),
    props: true,
  },
  {
    path: "/search",
    name: "Search",
    component: () => import("@/pages/search/SearchPage.vue"),
  },
  {
    path: "/terms",
    name: "Terms",
    component: () => import("@/pages/legal/PolicyPage.vue"),
  },
  {
    path: "/register",
    name: "Register",
    component: () => import("@/pages/auth/RegisterPage.vue"),
    meta: { guest: true },
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("@/pages/auth/LoginPage.vue"),
    meta: { guest: true },
  },
  {
    path: "/verify-identity",
    name: "VerifyIdentity",
    component: () => import("@/pages/profile/VerifyIdentityPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/profile",
    name: "Profile",
    component: () => import("@/pages/profile/ProfilePage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/profile/bids",
    name: "BidHistory",
    component: () => import("@/pages/profile/BidHistoryPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/seller/listings",
    name: "SellerListings",
    component: () => import("@/pages/seller/SellerListingsPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/seller/listings/create",
    name: "CreateListing",
    component: () => import("@/pages/seller/CreateListingPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/seller/listings/:id/edit",
    name: "EditListing",
    component: () => import("@/pages/seller/EditListingPage.vue"),
    props: true,
    meta: { requiresAuth: true },
  },
  {
    path: "/orders",
    name: "Orders",
    component: () => import("@/pages/orders/OrdersPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/orders/:id",
    name: "OrderDetail",
    component: () => import("@/pages/orders/OrderDetailPage.vue"),
    props: true,
    meta: { requiresAuth: true },
  },
  {
    path: "/disputes",
    name: "Disputes",
    component: () => import("@/pages/disputes/DisputesPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/disputes/file",
    name: "FileDispute",
    component: () => import("@/pages/disputes/FileDisputePage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/disputes/:id",
    name: "DisputeDetail",
    component: () => import("@/pages/disputes/DisputeDetailPage.vue"),
    props: true,
    meta: { requiresAuth: true },
  },
  {
    path: "/notifications",
    name: "Notifications",
    component: () => import("@/pages/notifications/NotificationsPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/pages/NotFoundPage.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  if (!authStore.initialized) {
    await authStore.initialize();
  }

  if (authStore.isAuthenticated && to.name === "MfaChallenge") {
    try {
      if ((await securityService.assurance()) === "aal2") {
        const target = String(to.query.redirect || "/");
        return next(
          target.startsWith("/") &&
            !target.startsWith("//") &&
            !target.startsWith("/auth/verify")
            ? target
            : "/",
        );
      }
    } catch {
      /* The challenge panel offers a retry and sign out. */
    }
  }

  let accountStatus;
  if (authStore.isAuthenticated && to.name !== "MfaChallenge") {
    try {
      const status = (accountStatus ||= await securityService.status());
      if (status.mfa_enabled && !status.session_verified)
        return next({ name: "MfaChallenge", query: { redirect: to.fullPath } });
    } catch {
      return next({ name: "MfaChallenge", query: { redirect: to.fullPath } });
    }
  }

  if (
    authStore.isAuthenticated &&
    to.meta.requiresAuth &&
    !["AccountSecurity", "MfaChallenge"].includes(to.name)
  ) {
    try {
      const status = (accountStatus ||= await securityService.status());
      if (
        !status.policies_current ||
        (status.mfa_enabled && !status.session_verified)
      )
        return next({ name: "AccountSecurity" });
    } catch {
      return next({ name: "AccountSecurity" });
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: "Login", query: { redirect: to.fullPath } });
  } else if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: "Home" });
  } else {
    next();
  }
});

export default router;
