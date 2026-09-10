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
    <label v-if="label" class="block text-sm font-medium text-heading">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :class="[
        'w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500',
        error ? 'border-danger' : 'border-border',
        disabled ? 'bg-surface cursor-not-allowed' : 'bg-white',
      ]"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
  </div>
</template>
