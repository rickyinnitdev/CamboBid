<script setup>
import { ref } from "vue";
import AdminSidebar from "@/components/admin/AdminSidebar.vue";
import AdminHeader from "@/components/admin/AdminHeader.vue";

const sidebarOpen = ref(true);
const mobileSidebarOpen = ref(false);

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
}

function toggleMobileSidebar() {
  mobileSidebarOpen.value = !mobileSidebarOpen.value;
}
</script>

<template>
  <div class="min-h-screen bg-surface flex">
    <!-- Desktop Sidebar -->
    <AdminSidebar :open="sidebarOpen" class="hidden lg:flex" />

    <!-- Mobile Sidebar Overlay -->
    <Transition
      enter-active-class="transition-opacity ease-linear duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity ease-linear duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="mobileSidebarOpen"
        class="fixed inset-0 z-40 bg-navy-900/50 backdrop-blur-sm lg:hidden"
        @click="mobileSidebarOpen = false"
      />
    </Transition>

    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <AdminSidebar
        v-if="mobileSidebarOpen"
        :open="true"
        class="fixed inset-y-0 left-0 z-50 lg:hidden"
        @close="mobileSidebarOpen = false"
      />
    </Transition>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0" :class="sidebarOpen ? 'lg:ml-60' : 'lg:ml-16'">
      <AdminHeader
        @toggle-sidebar="toggleSidebar"
        @toggle-mobile-sidebar="toggleMobileSidebar"
      />

      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
