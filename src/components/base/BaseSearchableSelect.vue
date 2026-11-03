<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import BaseFormLabel from './BaseFormLabel.vue'
import { ChevronDown, Search, CircleX } from '@lucide/vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },

  options: {
    type: Array,
    default: () => [],
  },

  label: {
    type: String,
    default: 'Form Label',
  },

  placeholder: {
    type: String,
    default: 'Search...',
  },

  allOptionsSelectedText: {
    type: String,
    default: 'Select an option',
  },

  showLabel: {
    type: Boolean,
    default: true,
  },

  name: {
    type: String,
    default: 'base-searchable-select',
  },

  id: {
    type: String,
    default: 'base-searchable-select',
  },

  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const searchQuery = ref('')
const highlightedIndex = ref(-1)
const componentRef = ref(null)

const selectedOption = computed(() => {
  return props.options.find((option) => String(option.value) === String(props.modelValue))
})

const filteredOptions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return props.options
  }

  return props.options.filter((option) => {
    const label = String(option.label || '').toLowerCase()
    const meta = String(option.meta || '').toLowerCase()

    return label.includes(query) || meta.includes(query)
  })
})

function openDropdown() {
  isOpen.value = true
  highlightedIndex.value = -1
}

function closeDropdown() {
  isOpen.value = false
  searchQuery.value = ''
  highlightedIndex.value = -1
}

function selectOption(option) {
  emit('update:modelValue', option.value)
  closeDropdown()
}

function clearSelection() {
  emit('update:modelValue', '')
  closeDropdown()
}

function handleKeydown(event) {
  if (!isOpen.value) {
    if (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === ' ') {
      event.preventDefault()
      openDropdown()
    }

    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()

      if (!filteredOptions.value.length) return

      highlightedIndex.value =
        highlightedIndex.value < filteredOptions.value.length - 1 ? highlightedIndex.value + 1 : 0

      break

    case 'ArrowUp':
      event.preventDefault()

      if (!filteredOptions.value.length) return

      highlightedIndex.value =
        highlightedIndex.value > 0 ? highlightedIndex.value - 1 : filteredOptions.value.length - 1

      break

    case 'Enter':
      event.preventDefault()

      if (highlightedIndex.value >= 0 && filteredOptions.value[highlightedIndex.value]) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      }

      break

    case 'Escape':
      event.preventDefault()
      closeDropdown()
      break
  }
}

function handleClickOutside(event) {
  if (componentRef.value && !componentRef.value.contains(event.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="componentRef" class="base-searchable-select-wrapper">
    <BaseFormLabel v-if="showLabel" :label="label" :for="id" />

    <div
      class="base-searchable-select"
      :class="{
        'is-open': isOpen,
        'has-error': error,
      }"
    >
      <!-- Selected value / trigger -->
      <button
        :id="id"
        type="button"
        class="base-searchable-select-trigger"
        :aria-expanded="isOpen"
        @click="isOpen ? closeDropdown() : openDropdown()"
        @keydown="handleKeydown"
      >
        <span v-if="selectedOption" class="selected-option">
          {{ selectedOption.label }}
        </span>

        <span v-else class="placeholder">
          {{ allOptionsSelectedText }}
        </span>

        <span class="dropdown-icon">
          <ChevronDown size="16" />
        </span>
      </button>

      <!-- Dropdown -->
      <div v-if="isOpen" class="base-searchable-select-dropdown">
        <div class="search-input-wrapper">
          <div class="search-input-label">
            <Search size="18" />
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              :placeholder="placeholder"
              autocomplete="off"
              @keydown="handleKeydown"
            />
          </div>
        </div>

        <div class="options-list" role="listbox">
          <button v-if="modelValue" type="button" class="clear-option" @click="clearSelection">
            <CircleX size="16" />
            Clear selection
          </button>

          <button
            v-for="(option, index) in filteredOptions"
            :key="option.value"
            type="button"
            class="searchable-option"
            :class="{
              'is-highlighted': index === highlightedIndex,
              'is-selected': String(option.value) === String(modelValue),
            }"
            @click="selectOption(option)"
            @mouseenter="highlightedIndex = index"
          >
            <span class="option-label">
              {{ option.label }}
            </span>

            <span v-if="option.meta" class="option-meta">
              {{ option.meta }}
            </span>
          </button>

          <div v-if="filteredOptions.length === 0" class="empty-option">No options found</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.base-searchable-select-wrapper {
  position: relative;
  width: 100%;
}

.base-searchable-select {
  position: relative;
  width: 100%;
}

.base-searchable-select-trigger {
  display: flex;
  align-items: center;
  font-size: var(--font-size-default);
  justify-content: space-between;
  width: 100%;
  min-height: 42px;
  padding: 12px;
  border: 1px solid var(--color-border-default);
  border-radius: 4px;
  background: var(--color-bg-elevated);
  text-align: left;
  cursor: pointer;
}

.base-searchable-select-trigger:focus-visible {
  outline: none;
  border-color: var(--color-interactive-default);
  box-shadow: var(--shadow-default);
}

.base-searchable-select.is-open .base-searchable-select-trigger {
  border-color: var(--color-feedback-info);
  border-width: 2px;
}

.base-searchable-select.has-error .base-searchable-select-trigger {
  border-color: var(--color-feedback-error);
  border-width: 2px;
}

.placeholder {
  color: var(--color-text-secondary);
}

.base-searchable-select-dropdown {
  position: absolute;
  z-index: 50;
  top: calc(100% + 0.25rem);
  left: 0;
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--color-border-default);
  border-radius: 4px;
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-default);
}

.search-input-wrapper {
  padding: 0.5rem;
  border-bottom: 1px solid var(--color-border-default);
  background: var(--color-bg-elevated);
}

.search-input-label {
  position: relative;
}

.search-input-label .lucide {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
}

.search-input {
  display: block;
  width: 100%;
  min-height: 40px;
  padding: 8px 8px 8px 36px;
  border: 1px solid var(--color-border-default);
  border-radius: 4px;
  background: var(--color-bg-elevated);
}

.dropdown-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-input::placeholder {
  color: var(--color-text-secondary);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-interactive-default);
  box-shadow: var(--shadow-default);
}

.options-list {
  max-height: 280px;
  overflow-y: auto;
}

.searchable-option,
.clear-option {
  display: flex;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  gap: 8px;
}

.searchable-option {
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.625rem 0.75rem;
}

.searchable-option:hover,
.searchable-option.is-highlighted {
  background: var(--color-bg-subtle);
}

.searchable-option.is-selected {
  background: var(--color-feedback-info-subtle);
}

.option-label {
  font-weight: 500;
  line-height: 1.25rem;
}

.option-meta {
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  line-height: 1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.searchable-option.is-selected .option-label {
  color: var(--color-feedback-info);
}

.clear-option {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border-subtle);
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}

.empty-option {
  padding: 1rem 0.75rem;
  color: var(--color-text-secondary);
  text-align: center;
}

.base-searchable-select-error {
  margin: 0.375rem 0 0;
  color: var(--color-feedback-error);
  font-size: 0.8125rem;
}
</style>
