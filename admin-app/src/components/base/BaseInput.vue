<script setup>
defineProps({
  modelValue: { type: [String, Number], default: "" },
  label: { type: String, default: "" },
  type: { type: String, default: "text" },
  placeholder: { type: String, default: "" },
  error: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
});

defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="space-y-1">
    <label v-if="label" class="label">
      {{ label }}
      <span v-if="required" class="text-laterite">*</span>
    </label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :class="['input', error ? 'input-error' : '', disabled ? 'cursor-not-allowed bg-paper' : '']"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" class="error-text">{{ error }}</p>
  </div>
</template>
