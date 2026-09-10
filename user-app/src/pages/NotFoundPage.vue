<script setup>
import { useRouter } from "vue-router";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseButton from "@/components/base/BaseButton.vue";

const router = useRouter();
</script>

<template>
  <UserLayout>
    <div class="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div class="w-24 h-24 rounded-full bg-surface flex items-center justify-center mb-6">
        <span class="text-5xl font-bold text-muted/40">404</span>
      </div>
      <h1 class="text-3xl font-bold text-heading mb-2">Page Not Found</h1>
      <p class="text-muted mb-8 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <div class="flex items-center gap-3">
        <BaseButton variant="primary" @click="router.push('/')">Go Home</BaseButton>
        <BaseButton variant="outline" @click="router.back()">Go Back</BaseButton>
      </div>
    </div>
  </UserLayout>
</template>
