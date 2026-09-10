<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
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
    const notif = notifications.value.find((n) => n.id === id);
    if (notif) notif.read = true;
  } catch (err) {
    console.error("Failed to mark as read:", err);
  }
}

async function handleMarkAllRead() {
  try {
    await notificationService.markAllAsRead();
    notifications.value.forEach((n) => (n.read = true));
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
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold text-heading">{{ t("nav.notifications") }}</h1>
        <BaseButton variant="ghost" size="sm" @click="handleMarkAllRead">Mark all read</BaseButton>
      </div>

      <!-- Filter -->
      <div class="flex items-center gap-2 mb-6">
        <button
          v-for="opt in [{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }]"
          :key="opt.value"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="filter === opt.value ? 'bg-navy-700 text-white' : 'bg-surface text-muted hover:text-heading'"
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
        title="No Notifications"
        description="You're all caught up!"
        icon="inbox"
      />

      <div v-else class="space-y-2">
        <div
          v-for="notif in notifications"
          :key="notif.id"
          class="bg-white rounded-xl border border-border p-4 flex items-start gap-3 transition-colors"
          :class="!notif.read && 'bg-navy-700/5'"
        >
          <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
            :class="notif.read ? 'bg-surface' : 'bg-navy-700/10'"
          >
            <svg class="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <router-link
              v-if="getNotificationLink(notif)"
              :to="getNotificationLink(notif)"
              class="text-sm text-heading hover:text-navy-700 transition-colors block"
            >
              {{ notif.message }}
            </router-link>
            <p v-else class="text-sm text-heading">{{ notif.message }}</p>
            <p class="text-xs text-muted mt-1">{{ timeAgo(notif.created_at) }}</p>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <button
              v-if="!notif.read"
              class="text-xs text-navy-700 hover:text-navy-800 px-2 py-1"
              @click="handleMarkRead(notif.id)"
            >
              Mark read
            </button>
            <button
              class="text-xs text-muted hover:text-danger px-2 py-1"
              @click="handleDelete(notif.id)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </UserLayout>
</template>
