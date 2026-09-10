<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "@/composables/useAuth";
import { listingService } from "@/services/listingService";
import { searchService } from "@/services/searchService";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseCard from "@/components/base/BaseCard.vue";

const { t } = useI18n();
const router = useRouter();
const { user } = useAuth();

const categories = ref([]);
const loading = ref(false);
const submitting = ref(false);
const error = ref("");

const form = ref({
  title: "",
  description: "",
  category_id: "",
  condition: "good",
  starting_price: "",
  reserve_price: "",
  buy_it_now_price: "",
});

const imageFiles = ref([]);
const imagePreviews = ref([]);

const conditionOptions = [
  { value: "new", label: t("listing.condition.new") },
  { value: "like_new", label: t("listing.condition.like_new") },
  { value: "excellent", label: t("listing.condition.excellent") },
  { value: "good", label: t("listing.condition.good") },
  { value: "fair", label: t("listing.condition.fair") },
  { value: "poor", label: t("listing.condition.poor") },
];

onMounted(async () => {
  try {
    categories.value = await searchService.getCategories();
  } catch (err) {
    console.error("Failed to load categories:", err);
  }
});

function handleImagesChange(e) {
  const files = Array.from(e.target.files || []);
  imageFiles.value = files;
  imagePreviews.value = files.map((f) => URL.createObjectURL(f));
}

function removeImage(index) {
  imageFiles.value.splice(index, 1);
  imagePreviews.value.splice(index, 1);
}

async function handleSubmit() {
  submitting.value = true;
  error.value = "";
  try {
    const listing = await listingService.createListing({
      seller_id: user.value.id,
      title: form.value.title,
      description: form.value.description,
      category_id: form.value.category_id || null,
      condition: form.value.condition,
      starting_price: Number(form.value.starting_price),
      reserve_price: form.value.reserve_price ? Number(form.value.reserve_price) : null,
      buy_it_now_price: form.value.buy_it_now_price ? Number(form.value.buy_it_now_price) : null,
      status: "pending",
    });

    if (imageFiles.value.length > 0) {
      const images = await listingService.uploadImages(listing.id, imageFiles.value);
      await listingService.updateListing(listing.id, { images });
    }

    router.push("/seller/listings");
  } catch (err) {
    error.value = err.message || "Failed to create listing.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UserLayout>
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 class="text-2xl font-bold text-heading mb-8">{{ t("listing.create") }}</h1>

      <BaseCard>
        <div class="p-6">
          <div v-if="error" class="p-3 rounded-lg bg-danger/10 text-danger text-sm mb-4">{{ error }}</div>

          <form @submit.prevent="handleSubmit" class="space-y-6">
            <BaseInput
              v-model="form.title"
              :label="t('listing.title')"
              placeholder="e.g. Rolex Submariner 2024"
              required
            />

            <div>
              <label class="block text-sm font-medium text-heading mb-1.5">{{ t("listing.description") }} *</label>
              <textarea
                v-model="form.description"
                rows="4"
                required
                class="block w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 transition-colors resize-none"
                placeholder="Describe your item in detail..."
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-heading mb-1.5">{{ t("listing.category") }} *</label>
                <select
                  v-model="form.category_id"
                  required
                  class="block w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500"
                >
                  <option value="" disabled>Select category</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-heading mb-1.5">{{ t("listing.condition") }} *</label>
                <select
                  v-model="form.condition"
                  required
                  class="block w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500"
                >
                  <option v-for="opt in conditionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <BaseInput
                v-model="form.starting_price"
                :label="t('listing.starting_price')"
                type="number"
                placeholder="0.00"
                required
              />
              <BaseInput
                v-model="form.reserve_price"
                :label="t('listing.reserve_price')"
                type="number"
                placeholder="Optional"
              />
              <BaseInput
                v-model="form.buy_it_now_price"
                :label="t('listing.buy_it_now_price')"
                type="number"
                placeholder="Optional"
              />
            </div>

            <!-- Images -->
            <div>
              <label class="block text-sm font-medium text-heading mb-1.5">{{ t("listing.images") }}</label>
              <input
                type="file"
                accept="image/*"
                multiple
                class="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-navy-700 file:text-white hover:file:bg-navy-800 file:cursor-pointer"
                @change="handleImagesChange"
              />
              <div v-if="imagePreviews.length" class="flex flex-wrap gap-3 mt-3">
                <div v-for="(preview, i) in imagePreviews" :key="i" class="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img :src="preview" class="w-full h-full object-cover" />
                  <button
                    type="button"
                    class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-danger/80 text-white flex items-center justify-center text-xs"
                    @click="removeImage(i)"
                  >×</button>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3 pt-2">
              <BaseButton type="submit" variant="primary" :loading="submitting">
                {{ t("listing.submit") }}
              </BaseButton>
              <router-link to="/seller/listings">
                <BaseButton variant="ghost">{{ t("common.cancel") }}</BaseButton>
              </router-link>
            </div>
          </form>
        </div>
      </BaseCard>
    </div>
  </UserLayout>
</template>
