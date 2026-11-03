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
    <main class="page-container max-w-5xl">
      <div class="page-header">
        <div>
          <p class="kicker">Seller studio</p>
          <h1 class="page-title mt-3">{{ t("listing.create") }}</h1>
          <p class="page-subtitle mt-3">
            Add clear photos and accurate details. Listings are reviewed before
            they go live.
          </p>
        </div>
        <router-link to="/seller/listings" class="btn-outline btn-sm self-start sm:self-auto">
          Your listings
        </router-link>
      </div>

      <div class="grid gap-5 lg:grid-cols-[1fr_300px]">
        <BaseCard padded>
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

              <BaseInput
                v-model="form.title"
                :label="t('listing.title')"
                placeholder="e.g. Vintage mechanical watch, 1968"
                required
              />

              <div>
                <label for="listing-description" class="label">
                  {{ t("listing.description") }} <span class="text-danger" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="listing-description"
                  v-model="form.description"
                  rows="5"
                  required
                  class="input resize-none"
                  placeholder="Describe condition, provenance, dimensions and what is included."
                />
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label for="listing-category" class="label">
                    {{ t("listing.category") }} <span class="text-danger" aria-hidden="true">*</span>
                  </label>
                  <select id="listing-category" v-model="form.category_id" required class="select">
                    <option value="" disabled>Select category</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </div>
                <div>
                  <label for="listing-condition" class="label">
                    {{ t("listing.condition") }} <span class="text-danger" aria-hidden="true">*</span>
                  </label>
                  <select id="listing-condition" v-model="form.condition" required class="select">
                    <option v-for="opt in conditionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
              </div>
            </section>

            <section class="space-y-4 border-t border-border pt-6">
              <h2 class="font-display text-base font-semibold text-heading">Pricing</h2>
              <div class="grid gap-4 sm:grid-cols-3">
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
              <p class="text-xs leading-5 text-muted">
                All amounts are in USD. A reserve price is hidden from bidders
                until it is met.
              </p>
            </section>

            <section class="space-y-4 border-t border-border pt-6">
              <h2 class="font-display text-base font-semibold text-heading">Photos</h2>
              <div>
                <label for="listing-images" class="label">{{ t("listing.images") }}</label>
                <input
                  id="listing-images"
                  type="file"
                  accept="image/*"
                  multiple
                  class="block w-full cursor-pointer rounded-lg border border-line bg-white text-sm text-body file:mr-4 file:cursor-pointer file:border-0 file:bg-navy-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                  @change="handleImagesChange"
                />
                <div v-if="imagePreviews.length" class="mt-3 flex flex-wrap gap-3">
                  <div
                    v-for="(preview, i) in imagePreviews"
                    :key="i"
                    class="relative h-20 w-20 overflow-hidden rounded-lg border border-border"
                  >
                    <img :src="preview" alt="" class="h-full w-full object-cover" />
                    <button
                      type="button"
                      class="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-navy-900/80 text-xs text-white"
                      :aria-label="`Remove image ${i + 1}`"
                      @click="removeImage(i)"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div class="flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <BaseButton type="submit" variant="primary" :loading="submitting">
                {{ t("listing.submit") }}
              </BaseButton>
              <router-link to="/seller/listings">
                <BaseButton variant="ghost">{{ t("common.cancel") }}</BaseButton>
              </router-link>
            </div>
          </form>
        </BaseCard>

        <aside class="space-y-4">
          <BaseCard padded>
            <h2 class="font-display text-base font-semibold text-heading">
              A good listing
            </h2>
            <ul class="mt-3 space-y-3 text-sm leading-6 text-body">
              <li>Use natural light and show any wear clearly.</li>
              <li>State what is included — box, papers, accessories.</li>
              <li>Be precise about dimensions and shipping.</li>
            </ul>
          </BaseCard>
          <BaseCard padded>
            <h2 class="font-display text-base font-semibold text-heading">
              Review
            </h2>
            <p class="mt-2 text-sm leading-6 text-body">
              New listings start in review. You can edit the details while the
              listing is pending.
            </p>
          </BaseCard>
        </aside>
      </div>
    </main>
  </UserLayout>
</template>
