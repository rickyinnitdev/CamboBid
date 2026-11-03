<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import UserLayout from "@/components/layout/UserLayout.vue";
import KhmerDivider from "@/components/base/KhmerDivider.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";
import BaseEmptyState from "@/components/base/BaseEmptyState.vue";
import { notificationService } from "@/services/notificationService";

const { t } = useI18n();
const notifications = ref([]);
const loading = ref(true);
const total = ref(0);
const filter = ref("all");
let notifChannel = null;

async function loadNotifications() {
  loading.value = true;
  try {
    const result = await notificationService.getNotifications({
      unreadOnly: filter.value === "unread",
      limit: 50,
    });
    notifications.value = result.notifications;
    total.value = result.total;
  } catch (err) {
    console.error("Failed to load notifications:", err);
  } finally {
    loading.value = false;
  }
}

async function handleMarkRead(id) {
  try {
    await notificationService.markAsRead(id);
    if (filter.value === "unread") {
      notifications.value = notifications.value.filter((n) => n.id !== id);
      total.value = Math.max(0, total.value - 1);
    } else {
      const notif = notifications.value.find((n) => n.id === id);
      if (notif) notif.read = true;
    }
  } catch (err) {
    console.error("Failed to mark as read:", err);
  }
}

async function handleMarkAllRead() {
  try {
    await notificationService.markAllAsRead();
    if (filter.value === "unread") {
      notifications.value = [];
      total.value = 0;
    } else {
      notifications.value.forEach((n) => (n.read = true));
    }
  } catch (err) {
    console.error("Failed to mark all as read:", err);
  }
}

async function handleDelete(id) {
  try {
    await notificationService.deleteNotification(id);
    notifications.value = notifications.value.filter((n) => n.id !== id);
  } catch (err) {
    console.error("Failed to delete notification:", err);
  }
}

function getNotificationLink(notif) {
  if (notif.auction_id) return `/auctions/${notif.auction_id}`;
  return null;
}

function getNotificationTitle(notif) {
  return notif.title || notif.type || "Notification";
}

function getNotificationBody(notif) {
  return notif.body || notif.message || "";
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

onMounted(() => {
  loadNotifications();
  notificationService.subscribeToNotifications(() => {
    loadNotifications();
  }).then((ch) => { notifChannel = ch; });
});

onUnmounted(() => {
  notificationService.unsubscribeFromNotifications(notifChannel);
});
</script>

<template>
  <UserLayout>
    <main class="page-container max-w-3xl">
      <KhmerDivider class="mb-6" />
      <div class="page-header">
        <div>
          <p class="kicker">Account</p>
          <h1 class="page-title mt-3">{{ t("nav.notifications") }}</h1>
          <p class="page-subtitle mt-3">
            Stay up to date on bids, auctions and account activity.
          </p>
        </div>
        <BaseButton variant="outline" size="sm" class="self-start sm:self-auto" @click="handleMarkAllRead">
          Mark all read
        </BaseButton>
      </div>

      <div class="mb-6 flex items-center gap-2" role="group" aria-label="Notification filter">
        <button
          v-for="opt in [{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }]"
          :key="opt.value"
          class="rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"
          :class="
            filter === opt.value
              ? 'border-navy-900 bg-navy-900 text-white'
              : 'border-border bg-white text-body hover:border-navy-300 hover:text-heading'
          "
          :aria-pressed="filter === opt.value"
          @click="filter = opt.value; loadNotifications()"
        >
          {{ opt.label }}
        </button>
      </div>

      <div v-if="loading" class="space-y-3">
        <BaseSkeleton v-for="i in 5" :key="i" type="card" />
      </div>

      <BaseEmptyState
        v-else-if="notifications.length === 0"
        title="No notifications"
        description="You're all caught up."
        icon="inbox"
      />

      <div v-else class="space-y-2">
        <div
          v-for="notif in notifications"
          :key="notif.id"
          class="flex items-start gap-3 rounded-2xl border p-4 transition-colors"
          :class="
            notif.read
              ? 'border-border bg-white'
              : 'border-navy-200 bg-navy-50/60'
          "
        >
          <div
            class="relative grid h-9 w-9 shrink-0 place-items-center rounded-full"
            :class="notif.read ? 'bg-surface text-muted' : 'bg-navy-100 text-navy-700'"
          >
            <span
              v-if="!notif.read"
              class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-gold-500 ring-2 ring-white"
              aria-hidden="true"
            />
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>

          <div class="min-w-0 flex-1">
            <router-link
              v-if="getNotificationLink(notif)"
              :to="getNotificationLink(notif)"
              class="block break-words text-sm font-semibold text-heading transition-colors hover:text-navy-700"
            >
              {{ getNotificationTitle(notif) }}
            </router-link>
            <p v-else class="break-words text-sm font-semibold text-heading">
              {{ getNotificationTitle(notif) }}
            </p>
            <p
              v-if="getNotificationBody(notif)"
              class="mt-1 line-clamp-2 break-words text-sm leading-6 text-body"
            >
              {{ getNotificationBody(notif) }}
            </p>
            <p class="mt-2 text-xs text-muted">{{ timeAgo(notif.created_at) }}</p>
          </div>

          <div class="flex shrink-0 items-center gap-1 self-center">
            <button
              v-if="!notif.read"
              class="rounded-md px-2 py-1 text-xs font-medium text-navy-700 transition-colors hover:bg-white hover:text-navy-900"
              @click="handleMarkRead(notif.id)"
            >
              Mark read
            </button>
            <button
              class="rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-danger"
              @click="handleDelete(notif.id)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </main>
  </UserLayout>
</template>
