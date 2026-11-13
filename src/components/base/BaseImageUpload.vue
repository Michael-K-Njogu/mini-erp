<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { Upload, ImagePlus as ImageIcon, X } from '@lucide/vue'

import BaseButton from './BaseButton.vue'

const props = defineProps({
  modelValue: {
    type: [String, File, null],
    default: null,
  },

  label: {
    type: String,
    default: 'Upload Image',
  },

  hint: {
    type: String,
    default: 'Drag and drop or upload a JPG or PNG up to 2MB',
  },

  error: {
    type: String,
    default: '',
  },

  disabled: {
    type: Boolean,
    default: false,
  },

  uploadDisabled: {
    type: Boolean,
    default: false,
  },

  size: {
    type: Number,
    default: 100,
  },
})

const emit = defineEmits(['update:modelValue'])

const fileInput = ref(null)
const previewUrl = ref(null)
const uploadError = ref('')

const preview = computed(() => {
  if (previewUrl.value) {
    return previewUrl.value
  }

  if (typeof props.modelValue === 'string') {
    return props.modelValue
  }

  return null
})

function openFilePicker() {
  if (props.disabled || props.uploadDisabled) return

  fileInput.value?.click()
}

function handleFileChange(event) {
  if (props.disabled || props.uploadDisabled) return
  const file = event.dataTransfer?.files?.[0] || event.target.files?.[0]

  if (!file) return

  uploadError.value = ''

  const allowedTypes = ['image/jpeg', 'image/png']

  if (!allowedTypes.includes(file.type)) {
    uploadError.value = 'Please upload a JPG or PNG image.'

    if (event.target.type === 'file') event.target.value = ''
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    uploadError.value = 'Image size must be less than or equal to 2MB.'

    if (event.target.type === 'file') event.target.value = ''
    return
  }

  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }

  previewUrl.value = URL.createObjectURL(file)

  emit('update:modelValue', file)

  if (event.target.type === 'file') event.target.value = ''
}

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

function removeImage() {
  if (props.disabled) return
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }

  emit('update:modelValue', null)
}
</script>

<template>
  <div class="image-upload">
    <label class="form-label">
      {{ label }}
    </label>

    <div class="image-upload-content" @dragover.prevent @drop.prevent="handleFileChange">
      <button
        type="button"
        class="image-preview"
        :aria-label="label"
        :style="{
          width: `${size}px`,
          height: `${size}px`,
        }"
        :disabled="disabled || uploadDisabled"
        @click="openFilePicker"
      >
        <img v-if="preview" :src="preview" alt="" />

        <ImageIcon v-else :size="28" />
      </button>

      <div class="image-upload-actions">
        <div class="image-upload-actions__buttons">
          <BaseButton
            type="button"
            label="Upload Image"
            variant="secondary"
            size="md"
            :disabled="disabled || uploadDisabled"
            @click="openFilePicker"
          />

          <BaseButton
            v-if="preview"
            label="Remove"
            type="button"
            variant="danger"
            size="md"
            class="remove-image"
            :disabled="disabled"
            @click="removeImage"
          >
            <template #icon>
              <X :size="16" />
            </template>
          </BaseButton>
        </div>

        <p class="image-upload-hint">
          {{ hint }}
        </p>

        <p v-if="uploadError || error" class="invalid">
          {{ uploadError || error }}
        </p>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png"
      :disabled="disabled || uploadDisabled"
      hidden
      @change="handleFileChange"
    />
  </div>
</template>
