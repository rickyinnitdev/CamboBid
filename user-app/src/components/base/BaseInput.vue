<script setup>
const props = defineProps({
  modelValue: { type: [String, Number], default: "" },
  label: { type: String, default: "" },
  type: { type: String, default: "text" },
  placeholder: { type: String, default: "" },
  error: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  id: { type: String, default: () => `input-${Math.random().toString(36).slice(2, 8)}` },
});

const emit = defineEmits(["update:modelValue"]);
</script>

<template>
  <div>
    <label v-if="label" :for="id" class="block text-sm font-medium text-heading mb-1.5">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :class="[
        'block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 transition-colors',
        error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border focus:border-navy-500 focus:ring-navy-500/20',
        disabled && 'opacity-50 cursor-not-allowed bg-surface',
      ]"
      @input="emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" class="text-xs text-danger mt-1">{{ error }}</p>
  </div>
</template>
