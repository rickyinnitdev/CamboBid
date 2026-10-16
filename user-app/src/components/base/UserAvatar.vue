<script setup>
import { computed, ref, watch } from "vue";
const props = defineProps({
  profile: Object,
  user: Object,
  name: String,
  src: String,
});
const failed = ref(false);
const source = computed(
  () =>
    props.src ||
    props.profile?.avatar_url ||
    props.user?.user_metadata?.avatar_url ||
    props.user?.user_metadata?.picture ||
    "",
);
watch(source, () => {
  failed.value = false;
});
</script>
<template>
  <span
    class="inline-flex shrink-0 overflow-hidden rounded-full bg-teal-100 text-teal-900 items-center justify-center font-semibold"
    role="img"
    :aria-label="name || profile?.display_name || 'Profile'"
    ><img
      v-if="source && !failed"
      :src="source"
      alt=""
      class="h-full w-full object-cover"
      referrerpolicy="no-referrer"
      @error="failed = true"
    /><span v-else>{{
      (name || profile?.display_name || user?.user_metadata?.full_name || "U")
        .charAt(0)
        .toUpperCase()
    }}</span></span
  >
</template>
