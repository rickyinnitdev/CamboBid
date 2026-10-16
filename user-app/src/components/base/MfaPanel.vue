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
  <section class="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
    <h2 class="text-lg font-bold">Authenticator verification</h2>
    <p v-if="!verified" class="text-sm text-slate-600">
      Use Google Authenticator, Microsoft Authenticator or another TOTP app.
      Verify a code after signing in to unlock protected actions.
    </p>
    <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
    <div
      v-if="verified"
      role="status"
      class="rounded-xl bg-green-50 p-4 text-green-800"
    >
      <p class="font-semibold">Authenticator verified</p>
      <p class="mt-1 text-sm">
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
      class="rounded-xl bg-blue-800 px-4 py-3 text-white disabled:opacity-50"
      :disabled="busy"
      @click="enroll"
    >
      Set up authenticator
    </button>
    <div v-if="enrollment && !verified" class="space-y-3">
      <img
        :src="qrSource"
        alt="Scan this authenticator setup QR privately"
        class="h-48 w-48"
      />
      <details class="text-sm">
        <summary>Can't scan? Enter setup key</summary>
        <code class="break-all select-all">{{ enrollment.totp.secret }}</code>
      </details>
      <p class="text-xs text-amber-800">
        Keep the setup key private. Do not show this screen during a public
        presentation.
      </p>
    </div>
    <form
      v-if="
        !verified &&
        (enrollment || factors.some((f) => f.status === 'verified'))
      "
      class="flex flex-wrap gap-3"
      @submit.prevent="verify"
    >
      <label class="text-sm"
        >Six-digit code<input
          v-model="code"
          aria-label="Authenticator code"
          autocomplete="one-time-code"
          inputmode="numeric"
          pattern="[0-9]{6}"
          maxlength="6"
          required
          class="mt-1 block rounded-xl border p-3"
      /></label>
      <button
        :disabled="busy"
        class="self-end rounded-xl bg-blue-800 px-4 py-3 text-white disabled:opacity-50"
      >
        Verify code
      </button>
    </form>
  </section>
</template>
