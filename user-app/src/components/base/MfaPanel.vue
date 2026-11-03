<script setup>
import { ref, onMounted, computed } from "vue";
import { securityService } from "@/services/securityService";
const emit = defineEmits(["verified"]);
const factors = ref([]),
  enrollment = ref(null),
  code = ref(""),
  error = ref(""),
  busy = ref(false),
  ready = ref(false),
  verified = ref(false);
const qrSource = computed(() => {
  const value = enrollment.value?.totp?.qr_code || "";
  const comma = value.indexOf(",");
  if (
    comma >= 0 &&
    value
      .slice(comma + 1)
      .trim()
      .startsWith("<svg")
  )
    return (
      value.slice(0, comma + 1) + encodeURIComponent(value.slice(comma + 1))
    );
  return value;
});
async function load() {
  const [currentFactors, level] = await Promise.all([
    securityService.factors(),
    securityService.assurance(),
  ]);
  factors.value = currentFactors;
  verified.value = level === "aal2";
  ready.value = true;
}
async function run(action) {
  error.value = "";
  busy.value = true;
  try {
    await action();
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
onMounted(() => run(load));
async function enroll() {
  await run(async () => {
    enrollment.value = await securityService.enroll();
  });
}
async function verify() {
  await run(async () => {
    const factor =
      enrollment.value?.id ||
      factors.value.find((f) => f.status === "verified")?.id;
    if (!factor) throw new Error("Set up an authenticator first");
    await securityService.verify(factor, code.value);
    await load();
    if (!verified.value)
      throw new Error(
        "Your session could not be verified. Please try a new authenticator code.",
      );
    enrollment.value = null;
    code.value = "";
    emit("verified");
  });
}
</script>
<template>
  <section class="surface-panel p-5 sm:p-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="font-display text-lg font-semibold text-heading">
          Authenticator verification
        </h2>
        <p v-if="!verified" class="mt-1.5 max-w-xl text-sm leading-6 text-body">
          Use Google Authenticator, Microsoft Authenticator or another TOTP app.
          Verify a code after signing in to unlock protected actions.
        </p>
      </div>
      <span
        class="badge"
        :class="verified ? 'bg-emerald-50 text-emerald-800' : 'bg-surface text-muted'"
      >
        {{ verified ? "Verified" : "Not verified" }}
      </span>
    </div>

    <p v-if="error" role="alert" class="mt-4 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
      {{ error }}
    </p>

    <div
      v-if="verified"
      role="status"
      class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
    >
      <p class="font-semibold">Authenticator verified</p>
      <p class="mt-1 leading-6">
        Two-factor authentication is complete for this session. Continue with
        your account security steps or wallet.
      </p>
    </div>

    <button
      v-if="
        ready &&
        !verified &&
        !enrollment &&
        !factors.some((f) => f.status === 'verified')
      "
      class="btn-primary mt-4"
      :disabled="busy"
      @click="enroll"
    >
      Set up authenticator
    </button>

    <div v-if="enrollment && !verified" class="mt-5 space-y-3">
      <img
        :src="qrSource"
        alt="Scan this authenticator setup QR privately"
        class="h-48 w-48 rounded-xl border border-border bg-white p-2"
      />
      <details class="text-sm text-body">
        <summary class="cursor-pointer font-medium text-heading">
          Can't scan? Enter setup key
        </summary>
        <code class="mt-2 block break-all rounded-lg bg-surface p-3 text-xs select-all">{{ enrollment.totp.secret }}</code>
      </details>
      <p class="rounded-lg border border-gold-200 bg-gold-50 p-3 text-xs leading-5 text-gold-900">
        Keep the setup key private. Do not show this screen during a public
        presentation.
      </p>
    </div>

    <form
      v-if="
        !verified &&
        (enrollment || factors.some((f) => f.status === 'verified'))
      "
      class="mt-5 flex flex-wrap items-end gap-3"
      @submit.prevent="verify"
    >
      <div>
        <label for="mfa-code" class="label">Six-digit code</label>
        <input
          id="mfa-code"
          v-model="code"
          aria-label="Authenticator code"
          autocomplete="one-time-code"
          inputmode="numeric"
          pattern="[0-9]{6}"
          maxlength="6"
          required
          class="input w-36 tracking-[0.3em]"
        />
      </div>
      <button :disabled="busy" class="btn-primary">
        Verify code
      </button>
    </form>
  </section>
</template>
