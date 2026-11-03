<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: { type: [String, Number], default: "" },
  label: { type: String, default: "" },
  type: { type: String, default: "text" },
  placeholder: { type: String, default: "" },
  error: { type: String, default: "" },
  hint: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  autocomplete: { type: String, default: undefined },
  inputmode: { type: String, default: undefined },
  min: { type: [String, Number], default: undefined },
  max: { type: [String, Number], default: undefined },
  step: { type: [String, Number], default: undefined },
  id: {
    type: String,
    default: () => `input-${Math.random().toString(36).slice(2, 8)}`,
  },
});

const emit = defineEmits(["update:modelValue"]);

const describedBy = computed(() => {
  if (props.error) return `${props.id}-error`;
  if (props.hint) return `${props.id}-hint`;
  return undefined;
});
</script>

<template>
  <div>
    <label v-if="label" :for="id" class="mb-1.5 block text-sm font-medium text-heading">
      {{ label }}
      <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :min="min"
      :max="max"
      :step="step"
      :aria-invalid="!!error"
      :aria-describedby="describedBy"
      :class="[
        'input',
        error && 'input-error',
        disabled && 'cursor-not-allowed bg-surface opacity-60',
      ]"
      @input="emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" :id="`${id}-error`" class="mt-1.5 text-xs text-danger">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${id}-hint`" class="mt-1.5 text-xs text-muted">
      {{ hint }}
    </p>
  </div>
</template>
