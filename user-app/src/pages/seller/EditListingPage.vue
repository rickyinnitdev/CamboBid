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
    <main class="page-container max-w-5xl">
      <div class="page-header">
        <div>
          <p class="kicker">Seller studio</p>
          <h1 class="page-title mt-3">{{ t("listing.edit") }}</h1>
          <p class="page-subtitle mt-3">
            Update the item details, pricing or photos. Changes are saved to the
            listing.
          </p>
        </div>
        <router-link to="/seller/listings" class="btn-outline btn-sm self-start sm:self-auto">
          Your listings
        </router-link>
      </div>

      <div v-if="loading" class="space-y-4">
        <BaseSkeleton type="card" />
      </div>

      <div
        v-else-if="error"
        role="alert"
        class="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger"
      >
        {{ error }}
      </div>

      <BaseCard v-else padded>
        <div
          v-if="error"
          role="alert"
          class="mb-5 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger"
        >
          {{ error }}
        </div>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <section class="space-y-4">
            <h2 class="font-display text-base font-semibold text-heading">Item details</h2>

            <BaseInput v-model="form.title" :label="t('listing.title')" required />

            <div>
              <label for="edit-description" class="label">
                {{ t("listing.description") }} <span class="text-danger" aria-hidden="true">*</span>
              </label>
              <textarea
                id="edit-description"
                v-model="form.description"
                rows="5"
                required
                class="input resize-none"
              />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="edit-category" class="label">{{ t("listing.category") }}</label>
                <select id="edit-category" v-model="form.category_id" class="select">
                  <option value="">Select category</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
              <div>
                <label for="edit-condition" class="label">{{ t("listing.condition") }}</label>
                <select id="edit-condition" v-model="form.condition" class="select">
                  <option v-for="opt in conditionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
            </div>
          </section>

          <section class="space-y-4 border-t border-border pt-6">
            <h2 class="font-display text-base font-semibold text-heading">Pricing</h2>
            <div class="grid gap-4 sm:grid-cols-3">
              <BaseInput v-model="form.starting_price" :label="t('listing.starting_price')" type="number" required />
              <BaseInput v-model="form.reserve_price" :label="t('listing.reserve_price')" type="number" />
              <BaseInput v-model="form.buy_it_now_price" :label="t('listing.buy_it_now_price')" type="number" />
            </div>
          </section>

          <section class="space-y-4 border-t border-border pt-6">
            <h2 class="font-display text-base font-semibold text-heading">Photos</h2>

            <div v-if="existingImages.length">
              <p class="label">Current photos</p>
              <div class="flex flex-wrap gap-3">
                <div
                  v-for="(img, i) in existingImages"
                  :key="i"
                  class="relative h-20 w-20 overflow-hidden rounded-lg border border-border"
                >
                  <img :src="img.url || img" alt="" class="h-full w-full object-cover" />
                  <button
                    type="button"
                    class="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-navy-900/80 text-xs text-white"
                    :aria-label="`Remove image ${i + 1}`"
                    @click="removeExistingImage(i)"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label for="edit-images" class="label">Add new photos</label>
              <input
                id="edit-images"
                type="file"
                accept="image/*"
                multiple
                class="block w-full cursor-pointer rounded-lg border border-line bg-white text-sm text-body file:mr-4 file:cursor-pointer file:border-0 file:bg-navy-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                @change="handleNewImages"
              />
              <div v-if="newImagePreviews.length" class="mt-3 flex flex-wrap gap-3">
                <div
                  v-for="(preview, i) in newImagePreviews"
                  :key="i"
                  class="relative h-20 w-20 overflow-hidden rounded-lg border border-border"
                >
                  <img :src="preview" alt="" class="h-full w-full object-cover" />
                  <button
                    type="button"
                    class="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-navy-900/80 text-xs text-white"
                    :aria-label="`Remove new image ${i + 1}`"
                    @click="removeNewImage(i)"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div class="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <BaseButton type="submit" variant="primary" :loading="submitting">
              {{ t("common.save") }}
            </BaseButton>
            <router-link to="/seller/listings">
              <BaseButton variant="ghost">{{ t("common.cancel") }}</BaseButton>
            </router-link>
          </div>
        </form>
      </BaseCard>
    </main>
  </UserLayout>
</template>
