<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { listingService } from "@/services/listingService";
import { searchService } from "@/services/searchService";
import UserLayout from "@/components/layout/UserLayout.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const listing = ref(null);
const categories = ref([]);
const loading = ref(true);
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

const existingImages = ref([]);
const newImageFiles = ref([]);
const newImagePreviews = ref([]);

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
    const [listingData, catData] = await Promise.all([
      listingService.getListingById(route.params.id),
      searchService.getCategories(),
    ]);
    listing.value = listingData;
    categories.value = catData;
    form.value.title = listingData.title || "";
    form.value.description = listingData.description || "";
    form.value.category_id = listingData.category_id || "";
    form.value.condition = listingData.condition || "good";
    form.value.starting_price = listingData.starting_price || "";
    form.value.reserve_price = listingData.reserve_price || "";
    form.value.buy_it_now_price = listingData.buy_it_now_price || "";
    existingImages.value = Array.isArray(listingData.images) ? [...listingData.images] : [];
  } catch (err) {
    error.value = err.message || "Failed to load listing.";
  } finally {
    loading.value = false;
  }
});

function removeExistingImage(index) {
  existingImages.value.splice(index, 1);
}

function handleNewImages(e) {
  const files = Array.from(e.target.files || []);
  newImageFiles.value = files;
  newImagePreviews.value = files.map((f) => URL.createObjectURL(f));
}

function removeNewImage(index) {
  newImageFiles.value.splice(index, 1);
  newImagePreviews.value.splice(index, 1);
}

async function handleSubmit() {
  submitting.value = true;
  error.value = "";
  try {
    let allImages = [...existingImages.value];
    if (newImageFiles.value.length > 0) {
      const uploaded = await listingService.uploadImages(listing.value.id, newImageFiles.value);
      allImages = [...allImages, ...uploaded];
    }
    await listingService.updateListing(listing.value.id, {
      title: form.value.title,
      description: form.value.description,
      category_id: form.value.category_id || null,
      condition: form.value.condition,
      starting_price: Number(form.value.starting_price),
      reserve_price: form.value.reserve_price ? Number(form.value.reserve_price) : null,
      buy_it_now_price: form.value.buy_it_now_price ? Number(form.value.buy_it_now_price) : null,
      images: allImages,
    });
    router.push("/seller/listings");
  } catch (err) {
    error.value = err.message || "Failed to update listing.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UserLayout>
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 class="text-2xl font-bold text-heading mb-8">{{ t("listing.edit") }}</h1>

      <div v-if="loading" class="space-y-4">
        <BaseSkeleton type="card" />
      </div>

      <div v-else-if="error" class="p-4 rounded-lg bg-danger/10 text-danger text-sm">{{ error }}</div>

      <BaseCard v-else>
        <div class="p-6">
          <div v-if="error" class="p-3 rounded-lg bg-danger/10 text-danger text-sm mb-4">{{ error }}</div>

          <form @submit.prevent="handleSubmit" class="space-y-6">
            <BaseInput
              v-model="form.title"
              :label="t('listing.title')"
              required
            />

            <div>
              <label class="block text-sm font-medium text-heading mb-1.5">{{ t("listing.description") }} *</label>
              <textarea
                v-model="form.description"
                rows="4"
                required
                class="block w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 transition-colors resize-none"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-heading mb-1.5">{{ t("listing.category") }}</label>
                <select
                  v-model="form.category_id"
                  class="block w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500"
                >
                  <option value="">Select category</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-heading mb-1.5">{{ t("listing.condition") }}</label>
                <select
                  v-model="form.condition"
                  class="block w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500"
                >
                  <option v-for="opt in conditionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <BaseInput v-model="form.starting_price" :label="t('listing.starting_price')" type="number" required />
              <BaseInput v-model="form.reserve_price" :label="t('listing.reserve_price')" type="number" />
              <BaseInput v-model="form.buy_it_now_price" :label="t('listing.buy_it_now_price')" type="number" />
            </div>

            <!-- Existing Images -->
            <div v-if="existingImages.length">
              <label class="block text-sm font-medium text-heading mb-1.5">Current Images</label>
              <div class="flex flex-wrap gap-3">
                <div v-for="(img, i) in existingImages" :key="i" class="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img :src="img.url || img" class="w-full h-full object-cover" />
                  <button
                    type="button"
                    class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-danger/80 text-white flex items-center justify-center text-xs"
                    @click="removeExistingImage(i)"
                  >×</button>
                </div>
              </div>
            </div>

            <!-- New Images -->
            <div>
              <label class="block text-sm font-medium text-heading mb-1.5">Add New Images</label>
              <input
                type="file"
                accept="image/*"
                multiple
                class="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-navy-700 file:text-white hover:file:bg-navy-800 file:cursor-pointer"
                @change="handleNewImages"
              />
              <div v-if="newImagePreviews.length" class="flex flex-wrap gap-3 mt-3">
                <div v-for="(preview, i) in newImagePreviews" :key="i" class="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img :src="preview" class="w-full h-full object-cover" />
                  <button
                    type="button"
                    class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-danger/80 text-white flex items-center justify-center text-xs"
                    @click="removeNewImage(i)"
                  >×</button>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3 pt-2">
              <BaseButton type="submit" variant="primary" :loading="submitting">
                {{ t("common.save") }}
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
