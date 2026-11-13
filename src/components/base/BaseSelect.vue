<script setup>
import BaseFormLabel from './BaseFormLabel.vue'

defineProps({
  modelValue: {
    type: [String, Number, null],
    default: '',
  },
  options: {
    type: Array,
    default: () => [],
  },
  allOptionsSelectedText: {
    type: String,
    default: 'All Options',
  },
  showLabel: {
    type: Boolean,
    default: true,
  },
  label: {
    type: String,
    default: 'Form Label',
  },
  name: {
    type: String,
    default: 'base-text-input',
  },
  id: {
    type: String,
    default: 'base-text-input',
  },
  error: {
    type: String,
    default: '',
  },
  ariaLabel: {
    type: String,
    default: undefined,
  },
})

const emit = defineEmits(['update:modelValue'])

function handleChange(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="base-select-wrapper">
    <BaseFormLabel :label="label" :for="id" v-if="showLabel" />

    <select
      class="base-select"
      :name="name"
      :id="id"
      :value="modelValue"
      :aria-label="ariaLabel"
      @change="handleChange"
    >
      <option value="">{{ allOptionsSelectedText }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>
