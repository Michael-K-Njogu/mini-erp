<script setup>
import { computed, nextTick, ref } from 'vue'

// Vue port of the DDS Design System `dds-nav-tab` component (horizontal, manual activation).
const props = defineProps({
  id: { type: String, required: true },
  items: { type: Array, required: true }, // { value, label, disabled?, panelId? }
  modelValue: { type: String, default: '' },
  ariaLabel: { type: String, default: 'Content tabs' },
  activation: {
    type: String,
    default: 'manual',
    validator: (v) => ['manual', 'automatic'].includes(v),
  },
})
const emit = defineEmits(['update:modelValue'])

const buttons = ref([])
const focusedValue = ref(null)

const enabledItems = computed(() => props.items.filter((item) => !item.disabled))
const activeValue = computed(
  () =>
    enabledItems.value.find((item) => item.value === props.modelValue)?.value ??
    enabledItems.value[0]?.value,
)
const focusValue = computed(
  () =>
    enabledItems.value.find((item) => item.value === focusedValue.value)?.value ??
    activeValue.value,
)

const tabId = (value) => `${props.id}-tab-${encodeURIComponent(value)}`

function select(item) {
  if (item.disabled) return
  focusedValue.value = item.value
  if (item.value !== activeValue.value) emit('update:modelValue', item.value)
}

function onFocusOut(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) focusedValue.value = null
}

async function onKeydown(event, item) {
  if (event.altKey || event.ctrlKey || event.metaKey || item.disabled) return
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  const enabled = enabledItems.value
  event.preventDefault()
  const index = enabled.indexOf(item)
  const targetIndex =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? enabled.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length
  const target = enabled[targetIndex]
  focusedValue.value = target.value
  await nextTick()
  const button = buttons.value[props.items.indexOf(target)]
  button?.focus({ preventScroll: true })
  button?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  if (props.activation === 'automatic') select(target)
}
</script>

<template>
  <div
    class="dds-nav-tab"
    role="tablist"
    aria-orientation="horizontal"
    :aria-label="ariaLabel"
    @focusout="onFocusOut"
  >
    <button
      v-for="item in items"
      :id="tabId(item.value)"
      :key="item.value"
      ref="buttons"
      class="dds-nav-tab__tab"
      :class="{ 'dds-nav-tab__tab--active': item.value === activeValue }"
      type="button"
      role="tab"
      :disabled="item.disabled"
      :aria-selected="item.value === activeValue"
      :aria-controls="item.panelId || null"
      :tabindex="item.value === focusValue ? 0 : -1"
      @click="select(item)"
      @focus="focusedValue = item.value"
      @keydown="onKeydown($event, item)"
    >
      <span>{{ item.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.dds-nav-tab {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  max-width: 100%;
  padding-inline-end: var(--space-4);
  overflow-x: auto;
  border-bottom: 1px solid var(--color-border-default);
  background: var(--color-bg-elevated);
}

.dds-nav-tab__tab {
  position: relative;
  box-sizing: border-box;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--space-2);
  min-height: 37px;
  padding: var(--space-2) var(--space-3);
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-muted);
  font-family: var(--font-family-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-regular);
  line-height: 20px;
  white-space: nowrap;
  cursor: pointer;
}

.dds-nav-tab__tab--active {
  color: var(--color-interactive-default);
  font-weight: var(--font-weight-semibold);
}

.dds-nav-tab__tab--active::after {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 2px;
  background: var(--color-interactive-default);
  content: '';
}

.dds-nav-tab__tab:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: -2px;
}

.dds-nav-tab__tab:disabled {
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

@media (forced-colors: active) {
  .dds-nav-tab__tab--active::after {
    background: Highlight;
  }
  .dds-nav-tab__tab:disabled {
    color: GrayText;
  }
}
</style>
