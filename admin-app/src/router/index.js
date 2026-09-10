import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const routes = [
  {
    path: "/admin",
    name: "AdminDashboard",
    component: () => import("@/pages/DashboardPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/admin/login",
    name: "AdminLogin",
    component: () => import("@/pages/LoginPage.vue"),
    meta: { guest: true },
  },
  {
    path: "/admin/users",
    name: "AdminUsers",
    component: () => import("@/pages/users/UsersPage.vue"),
    meta: { requiresAuth: true, permission: "users.read" },
  },
  {
    path: "/admin/bidders",
    name: "AdminBidders",
    component: () => import("@/pages/bidders/BiddersPage.vue"),
    meta: { requiresAuth: true, permission: "users.read" },
  },
  {
    path: "/admin/bidders/:id",
    name: "AdminBidderDetail",
    component: () => import("@/pages/bidders/BidderDetailPage.vue"),
    props: true,
    meta: { requiresAuth: true, permission: "users.read" },
  },
  {
    path: "/admin/roles",
    name: "AdminRoles",
    component: () => import("@/pages/roles/RolesPage.vue"),
    meta: { requiresAuth: true, permission: "roles.manage" },
  },
  {
    path: "/admin/roles/:id/permissions",
    name: "AdminRolePermissions",
    component: () => import("@/pages/roles/RolePermissionsPage.vue"),
    props: true,
    meta: { requiresAuth: true, permission: "roles.manage" },
  },
  {
    path: "/admin/listings",
    name: "AdminListings",
    component: () => import("@/pages/listings/AdminListingsPage.vue"),
    meta: { requiresAuth: true, permission: "listings.read" },
  },
  {
    path: "/admin/listings/:id",
    name: "AdminListingDetail",
    component: () => import("@/pages/listings/AdminListingDetailPage.vue"),
    props: true,
    meta: { requiresAuth: true, permission: "listings.read" },
  },
  {
    path: "/admin/auctions",
    name: "AdminAuctions",
    component: () => import("@/pages/auctions/AdminAuctionsPage.vue"),
    meta: { requiresAuth: true, permission: "auctions.read" },
  },
  {
    path: "/admin/auctions/create",
    name: "AdminCreateAuction",
    component: () => import("@/pages/auctions/CreateAuctionPage.vue"),
    meta: { requiresAuth: true, permission: "auctions.create" },
  },
  {
    path: "/admin/auctions/:id/settings",
    name: "AdminAuctionSettings",
    component: () => import("@/pages/auctions/AuctionSettingsPage.vue"),
    props: true,
    meta: { requiresAuth: true, permission: "auctions.update" },
  },
  {
    path: "/admin/escrow",
    name: "AdminEscrow",
    component: () => import("@/pages/escrow/EscrowPage.vue"),
    meta: { requiresAuth: true, permission: "escrow.read" },
  },
  {
    path: "/admin/escrow/:id",
    name: "AdminEscrowDetail",
    component: () => import("@/pages/escrow/EscrowDetailPage.vue"),
    props: true,
    meta: { requiresAuth: true, permission: "escrow.read" },
  },
  {
    path: "/admin/disputes",
    name: "AdminDisputes",
    component: () => import("@/pages/disputes/AdminDisputesPage.vue"),
    meta: { requiresAuth: true, permission: "disputes.read" },
  },
  {
    path: "/admin/disputes/:id",
    name: "AdminDisputeDetail",
    component: () => import("@/pages/disputes/AdminDisputeDetailPage.vue"),
    props: true,
    meta: { requiresAuth: true, permission: "disputes.read" },
  },
  {
    path: "/admin/logs",
    name: "AdminLogs",
    component: () => import("@/pages/logs/ActivityLogsPage.vue"),
    meta: { requiresAuth: true, permission: "logs.read" },
  },
  {
    path: "/admin/analytics",
    name: "AdminAnalytics",
    component: () => import("@/pages/analytics/AnalyticsPage.vue"),
    meta: { requiresAuth: true, permission: "analytics.read" },
  },
  {
    path: "/admin/cms/translations",
    name: "AdminTranslations",
    component: () => import("@/pages/cms/TranslationsPage.vue"),
    meta: { requiresAuth: true, permission: "cms.manage" },
  },
  {
    path: "/admin/cms/categories",
    name: "AdminCategories",
    component: () => import("@/pages/categories/CategoriesPage.vue"),
    meta: { requiresAuth: true, permission: "categories.manage" },
  },
  {
    path: "/admin/settings",
    name: "AdminSettings",
    component: () => import("@/pages/settings/SettingsPage.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "AdminNotFound",
    component: () => import("@/pages/NotFoundPage.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0 };
  },
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  if (!authStore.initialized) {
    await authStore.initialize();
  }

  if (to.meta.guest) {
    if (authStore.isAuthenticated) {
      next({ name: "AdminDashboard" });
    } else {
      next();
    }
  } else if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      next({ name: "AdminLogin" });
    } else if (!authStore.isAdmin) {
      next({ name: "AdminDashboard" });
    } else if (to.meta.permission) {
      const [resource, action] = to.meta.permission.split(".");
      if (!authStore.hasPermission(action, resource)) {
        next({ name: "AdminDashboard" });
      } else {
        next();
      }
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
