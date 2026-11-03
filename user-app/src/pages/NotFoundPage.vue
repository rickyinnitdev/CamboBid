<script setup>
import { useRouter } from "vue-router";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseButton from "@/components/base/BaseButton.vue";

const router = useRouter();
</script>

<template>
  <UserLayout>
    <main class="page-container">
      <div class="mx-auto flex min-h-[58vh] max-w-lg flex-col items-center justify-center text-center">
        <p class="font-display text-[6rem] font-semibold leading-none tracking-[-0.06em] text-navy-100">
          404
        </p>
        <h1 class="mt-4 font-display text-3xl font-semibold tracking-[-0.025em] text-heading">
          Page not found
        </h1>
        <p class="mt-3 max-w-sm text-sm leading-6 text-body">
          The page you are looking for does not exist or has been moved.
        </p>
        <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
          <BaseButton variant="primary" @click="router.push('/')">
            Go home
          </BaseButton>
          <BaseButton variant="outline" @click="router.back()">
            Go back
          </BaseButton>
        </div>
        <div class="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          <router-link to="/auctions" class="font-medium text-navy-700 hover:text-navy-900">
            Browse auctions
          </router-link>
          <router-link to="/auctions/calendar" class="font-medium text-navy-700 hover:text-navy-900">
            Auction calendar
          </router-link>
        </div>
      </div>
    </main>
  </UserLayout>
</template>
