<script setup>
import UserAvatar from "@/components/base/UserAvatar.vue";
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { invoke } from "@/services/securityService";
import { userService } from "@/services/userService";
import { usePermission } from "@/composables/usePermission";
import { useToast } from "vue-toastification";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseBadge from "@/components/base/BaseBadge.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSkeleton from "@/components/base/BaseSkeleton.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const { canManageUsers, can } = usePermission();
const canReview = () => can("verify_identity", "users");
const security = ref(null),
  history = ref(null),
  rejectionReason = ref("");
const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");
async function inspectPayment(id) {
  try {
    await invoke("payments", { action: "inspect", id });
    await fetchBidder();
    toast.success("Receipt check completed");
  } catch (e) {
    toast.error(e.message);
  }
}
async function reconcilePayment(id) {
  const reason = window.prompt(
    "Reason for crediting this verified receipt to the wallet (10+ characters)",
  );
  if (!reason) return;
  try {
    const { rpc } = await import("@/services/securityService");
    await rpc("reconcile_payment", { p_id: id, p_reason: reason });
    await fetchBidder();
    toast.success("Receipt credited once to the wallet");
  } catch (e) {
    toast.error(e.message);
  }
}
async function openDocument() {
  try {
    const data = await invoke("identity-document", {
      user_id: route.params.id,
    });
    window.open(data.url, "_blank", "noopener,noreferrer");
  } catch (e) {
    toast.error(e.message);
  }
}
async function rejectIdentity() {
  actionLoading.value = true;
  try {
    bidder.value = await userService.verifyIdentity(
      route.params.id,
      false,
      rejectionReason.value,
      bidder.value.identity_document_path,
    );
    await fetchBidder();
    toast.success("Identity rejected with feedback");
  } catch (e) {
    toast.error(e.message);
  } finally {
    actionLoading.value = false;
  }
}

const bidder = ref(null);
const loading = ref(true);
const error = ref("");
const showSuspendModal = ref(false);
const suspendReason = ref("");
const actionLoading = ref(false);

async function fetchBidder() {
  loading.value = true;
  error.value = "";
  try {
    bidder.value = await userService.getUserById(route.params.id);
    [security.value, history.value] = await Promise.all([
      userService.security(route.params.id),
      userService.history(route.params.id),
    ]);
  } catch (e) {
    error.value = e.message || "Failed to load bidder";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchBidder);

async function verifyIdentity() {
  actionLoading.value = true;
  try {
    bidder.value = await userService.verifyIdentity(
      route.params.id,
      true,
      null,
      bidder.value.identity_document_path,
    );
    await fetchBidder();
    toast.success("Identity verified successfully");
  } catch (e) {
    toast.error(e.message || "Failed to verify identity");
  } finally {
    actionLoading.value = false;
  }
}

async function suspendUser() {
  actionLoading.value = true;
  try {
    bidder.value = await userService.suspendUser(
      route.params.id,
      suspendReason.value,
    );
    showSuspendModal.value = false;
    suspendReason.value = "";
    toast.success("User suspended");
  } catch (e) {
    toast.error(e.message || "Failed to suspend user");
  } finally {
    actionLoading.value = false;
  }
}

async function unsuspendUser() {
  actionLoading.value = true;
  try {
    bidder.value = await userService.unsuspendUser(route.params.id);
    toast.success("User unsuspended");
  } catch (e) {
    toast.error(e.message || "Failed to unsuspend user");
  } finally {
    actionLoading.value = false;
  }
}
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center gap-4">
        <button class="text-muted hover:text-heading" @click="router.back()">
          <svg
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <div>
          <h1 class="text-2xl font-bold text-heading">Bidder Details</h1>
          <p class="text-muted mt-1">View and manage bidder account</p>
        </div>
      </div>

      <div v-if="loading" class="space-y-4">
        <BaseCard><BaseSkeleton type="avatar" :rows="3" /></BaseCard>
      </div>

      <div
        v-else-if="error"
        class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
      >
        {{ error }}
      </div>

      <template v-else-if="bidder">
        <BaseCard v-if="security">
          <h2 class="mb-4 text-lg font-bold">Account security &amp; history</h2>
          <dl class="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <dt class="text-muted">Registered</dt>
              <dd>{{ formatDate(bidder.created_at) }}</dd>
            </div>
            <div>
              <dt class="text-muted">Email confirmed</dt>
              <dd>{{ formatDate(security.email_confirmed_at) }}</dd>
            </div>
            <div>
              <dt class="text-muted">Last sign-in</dt>
              <dd>{{ formatDate(security.last_sign_in_at) }}</dd>
            </div>
            <div>
              <dt class="text-muted">Providers</dt>
              <dd>{{ security.providers?.join(", ") || "Email" }}</dd>
            </div>
            <div>
              <dt class="text-muted">Authenticator</dt>
              <dd>{{ security.mfa_enabled ? "Enrolled" : "Not enrolled" }}</dd>
            </div>
            <div>
              <dt class="text-muted">Policy status</dt>
              <dd>
                {{
                  security.policies_current ? "Current" : "Acceptance required"
                }}
              </dd>
            </div>
            <div>
              <dt class="text-muted">ID submitted</dt>
              <dd>{{ formatDate(bidder.identity_submitted_at) }}</dd>
            </div>
            <div>
              <dt class="text-muted">ID decision</dt>
              <dd>
                {{ bidder.identity_status }} ·
                {{ formatDate(bidder.identity_reviewed_at) }}
              </dd>
            </div>
            <div>
              <dt class="text-muted">Reviewer</dt>
              <dd class="break-all">
                {{ bidder.identity_reviewed_by || "—" }}
              </dd>
            </div>
          </dl>
          <p v-if="bidder.identity_rejection_reason" class="mt-4 text-red-700">
            {{ bidder.identity_rejection_reason }}
          </p>
          <div v-if="history" class="mt-6 grid gap-6 md:grid-cols-2">
            <section>
              <h3 class="font-bold mb-2">Policy acceptances</h3>
              <p v-if="!history.policies.length" class="text-sm text-muted">
                No recorded acceptance of the current demo policies.
              </p>
              <p v-for="p in history.policies" :key="p.id" class="py-2 text-sm">
                {{ p.kind }} {{ p.version }} · {{ formatDate(p.accepted_at) }}
              </p>
              <p v-if="bidder.terms_accepted_at" class="text-xs text-muted">
                Legacy terms record: {{ bidder.terms_accepted_version }} ·
                {{ formatDate(bidder.terms_accepted_at) }}
              </p>
            </section>
            <section>
              <h3 class="font-bold mb-2">Wallet balances (USD)</h3>
              <p
                v-for="w in history.wallets"
                :key="w.mode"
                class="py-2 text-sm"
              >
                {{ w.mode }} · Available {{ (w.available / 100).toFixed(2) }} ·
                Reserved {{ (w.reserved / 100).toFixed(2) }}
              </p>
            </section>
            <section>
              <h3 class="font-bold mb-2">Identity review history</h3>
              <p v-for="r in history.reviews" :key="r.id" class="py-2 text-sm">
                {{ r.decision }} · {{ formatDate(r.reviewed_at) }} ·
                {{ r.reason }}
              </p>
            </section>
            <section>
              <h3 class="font-bold mb-2">Payments</h3>
              <div
                v-for="p in history.payments"
                :key="p.id"
                class="py-2 text-sm"
              >
                <p>
                  {{ p.mode }} · {{ (p.amount_minor / 100).toFixed(2) }} ·
                  {{ p.status }} · {{ formatDate(p.created_at) }}
                </p>
                <button
                  v-if="
                    canManageUsers &&
                    p.mode === 'live' &&
                    ['pending', 'expired'].includes(p.status)
                  "
                  class="text-blue-700 underline mr-3"
                  @click="inspectPayment(p.id)"
                >
                  Check provider receipt</button
                ><button
                  v-if="canManageUsers && p.status === 'reconciliation'"
                  class="text-blue-700 underline"
                  @click="reconcilePayment(p.id)"
                >
                  Credit verified receipt to wallet
                </button>
              </div>
            </section>
            <section>
              <h3 class="font-bold mb-2">Wallet ledger</h3>
              <p v-for="l in history.ledger" :key="l.id" class="py-2 text-xs">
                {{ l.mode }} · {{ l.reason.replaceAll("_", " ") }} · Available
                {{ (l.available_delta / 100).toFixed(2) }} / reserved
                {{ (l.reserved_delta / 100).toFixed(2) }} ·
                {{ formatDate(l.created_at) }}
              </p>
            </section>
            <section>
              <h3 class="font-bold mb-2">Account audit</h3>
              <p v-for="a in history.activity" :key="a.id" class="py-2 text-xs">
                {{ a.action.replaceAll("_", " ") }} ·
                {{ formatDate(a.created_at) }}
              </p>
            </section>
          </div>
        </BaseCard>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <BaseCard>
              <div class="flex items-center gap-4 mb-6">
                <UserAvatar :profile="bidder" class="w-16 h-16" />
                <div>
                  <h2 class="text-xl font-bold text-heading">
                    {{ bidder.display_name || "Unnamed" }}
                  </h2>
                  <p class="text-muted">{{ bidder.email }}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-xs text-muted mb-1">Role</p>
                  <BaseBadge variant="info">{{
                    bidder.role?.replace("_", " ")
                  }}</BaseBadge>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Status</p>
                  <BaseBadge :variant="bidder.suspended ? 'danger' : 'success'">
                    {{ bidder.suspended ? "Suspended" : "Active" }}
                  </BaseBadge>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Identity</p>
                  <BaseBadge
                    :variant="bidder.identity_verified ? 'success' : 'warning'"
                  >
                    {{ bidder.identity_verified ? "Verified" : "Pending" }}
                  </BaseBadge>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">
                    Legacy deposit flag (not wallet funds)
                  </p>
                  <BaseBadge
                    :variant="bidder.deposit_paid ? 'success' : 'warning'"
                  >
                    {{ bidder.deposit_paid ? "Paid" : "Unpaid" }}
                  </BaseBadge>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Bid Limit</p>
                  <p class="text-sm font-medium text-heading">
                    {{ bidder.bid_limit || "No limit" }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Reputation</p>
                  <p class="text-sm font-medium text-heading">
                    {{ bidder.reputation_score || 0 }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Joined</p>
                  <p class="text-sm font-medium text-heading">
                    {{ new Date(bidder.created_at).toLocaleDateString() }}
                  </p>
                </div>
              </div>
            </BaseCard>
          </div>

          <div class="space-y-4">
            <BaseCard>
              <h3 class="font-semibold text-heading mb-4">Actions</h3>
              <div
                v-if="canReview() && bidder.identity_document_path"
                class="mb-4 space-y-3"
              >
                <BaseButton
                  variant="secondary"
                  class="w-full"
                  @click="openDocument"
                  >Open sample document (60s link)</BaseButton
                ><template v-if="bidder.identity_status === 'pending'"
                  ><BaseInput
                    v-model="rejectionReason"
                    label="Rejection reason"
                  /><BaseButton
                    :disabled="
                      actionLoading || rejectionReason.trim().length < 3
                    "
                    variant="danger"
                    class="w-full"
                    @click="rejectIdentity"
                    >Reject with feedback</BaseButton
                  ></template
                >
              </div>
              <div class="space-y-3">
                <BaseButton
                  v-if="canReview() && bidder.identity_status === 'pending'"
                  variant="success"
                  class="w-full"
                  :loading="actionLoading"
                  @click="verifyIdentity"
                >
                  {{ t("admin.verify") }} Identity
                </BaseButton>
                <BaseButton
                  v-if="canManageUsers && !bidder.suspended"
                  variant="danger"
                  class="w-full"
                  @click="showSuspendModal = true"
                >
                  {{ t("admin.suspend") }} User
                </BaseButton>
                <BaseButton
                  v-if="canManageUsers && bidder.suspended"
                  variant="success"
                  class="w-full"
                  :loading="actionLoading"
                  @click="unsuspendUser"
                >
                  {{ t("admin.unsuspend") }} User
                </BaseButton>
              </div>
            </BaseCard>
          </div>
        </div>
      </template>

      <BaseModal
        :open="showSuspendModal"
        title="Suspend User"
        @close="showSuspendModal = false"
      >
        <div class="space-y-4">
          <BaseInput
            v-model="suspendReason"
            label="Reason for suspension"
            placeholder="Enter reason..."
            required
          />
        </div>
        <template #footer>
          <div class="flex justify-end gap-3">
            <BaseButton variant="secondary" @click="showSuspendModal = false">{{
              t("common.cancel")
            }}</BaseButton>
            <BaseButton
              variant="danger"
              :loading="actionLoading"
              @click="suspendUser"
              >{{ t("admin.suspend") }}</BaseButton
            >
          </div>
        </template>
      </BaseModal>
    </div>
  </AdminLayout>
</template>
