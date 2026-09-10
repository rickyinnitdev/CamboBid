import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const routes = [
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

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: "Login", query: { redirect: to.fullPath } });
  } else if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: "Home" });
  } else {
    next();
  }
});

export default router;
