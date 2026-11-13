<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from './base/BaseButton.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  steps: { type: Array, required: true },
  mobile: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
const emit = defineEmits(['finish', 'close-without-saving'])

const index = ref(0)
const heading = ref(null)
const dialog = ref(null)
const highlight = ref(null)
let previousFocus = null

const step = computed(() => props.steps[index.value])

function getTarget() {
  const selector = step.value?.selector
    ? props.mobile
      ? '.mobile-navigation-toggle'
      : step.value.selector
    : null
  return selector ? document.querySelector(selector) : null
}

function updateHighlight() {
  const target = getTarget()
  if (!target) {
    highlight.value = null
    return
  }
  const rect = target.getBoundingClientRect()
  highlight.value =
    rect.width && rect.height
      ? {
          top: `${rect.top - 4}px`,
          left: `${rect.left - 4}px`,
          width: `${rect.width + 8}px`,
          height: `${rect.height + 8}px`,
        }
      : null
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (!props.saving) emit('finish')
  } else if (event.key === 'Tab') {
    const buttons = [...dialog.value.querySelectorAll('button:not(:disabled)')]
    if (!buttons.length) {
      event.preventDefault()
      return
    }
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === heading.value)
    ) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

async function changeStep(offset) {
  index.value += offset
  await nextTick()
  getTarget()?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
  updateHighlight()
  heading.value?.focus()
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previousFocus = document.activeElement
      index.value = 0
      window.addEventListener('resize', updateHighlight)
      window.addEventListener('scroll', updateHighlight, true)
      await nextTick()
      if (!props.open) return
      updateHighlight()
      heading.value?.focus()
    } else {
      window.removeEventListener('resize', updateHighlight)
      window.removeEventListener('scroll', updateHighlight, true)
      const focus = previousFocus
      previousFocus = null
      await nextTick()
      if (!props.open && focus?.isConnected) focus.focus()
    }
  },
  { immediate: true },
)
watch(() => props.mobile, updateHighlight)

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateHighlight)
  window.removeEventListener('scroll', updateHighlight, true)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open && step" class="tour-overlay">
      <div v-if="highlight" class="tour-highlight" :style="highlight" aria-hidden="true"></div>
      <div v-else class="tour-scrim" aria-hidden="true"></div>
      <section
        ref="dialog"
        class="tour-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-tour-title"
        aria-describedby="product-tour-description"
        @keydown="onKeydown"
      >
        <p class="tour-progress">Product tour · {{ index + 1 }} of {{ steps.length }}</p>
        <h2 id="product-tour-title" ref="heading" tabindex="-1">{{ step.title }}</h2>
        <p id="product-tour-description">{{ step.description }}</p>
        <p v-if="mobile && step.selector" class="tour-mobile-hint">
          Open the navigation menu after the tour to find this page.
        </p>
        <p v-if="error" class="tour-error" role="alert">{{ error }}</p>
        <button
          v-if="error"
          type="button"
          class="tour-close-unsaved"
          @click="emit('close-without-saving')"
        >
          Close without saving
        </button>
        <div class="tour-actions">
          <BaseButton
            label="Skip tour"
            variant="secondary"
            :disabled="saving"
            @click="emit('finish')"
          />
          <div class="tour-actions__steps">
            <BaseButton
              v-if="index > 0"
              label="Back"
              variant="secondary"
              :disabled="saving"
              @click="changeStep(-1)"
            />
            <BaseButton
              v-if="index < steps.length - 1"
              label="Next"
              :disabled="saving"
              @click="changeStep(1)"
            />
            <BaseButton
              v-else
              label="Finish"
              :loading="saving"
              :disabled="saving"
              @click="emit('finish')"
            />
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.tour-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
}

.tour-scrim {
  position: absolute;
  inset: 0;
  background: var(--color-bg-scrim);
}

.tour-highlight {
  position: fixed;
  border: 2px solid var(--color-interactive-default);
  border-radius: var(--radius-sm);
  box-shadow: 0 0 0 100vmax var(--color-bg-scrim);
  pointer-events: none;
}

.tour-dialog {
  position: absolute;
  right: var(--space-4);
  bottom: var(--space-4);
  box-sizing: border-box;
  width: min(440px, calc(100% - 2 * var(--space-4)));
  max-height: calc(100dvh - 2 * var(--space-4));
  overflow: auto;
  padding: var(--space-5);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-elevated);
  background: color-mix(in srgb, var(--color-bg-elevated) 60%, transparent);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-default);
}

.tour-dialog h2 {
  margin: var(--space-2) 0;
  font-size: var(--font-size-lg);
}

.tour-dialog h2:focus {
  outline: none;
}

.tour-dialog p {
  font-size: var(--font-size-sm);
  margin: var(--space-2) 0;
}

.tour-progress,
.tour-mobile-hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.tour-error {
  color: var(--color-feedback-error);
}

.tour-close-unsaved {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--color-interactive-default);
  text-decoration: underline;
  cursor: pointer;
}

.tour-actions,
.tour-actions__steps {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tour-actions {
  justify-content: space-between;
  margin-top: var(--space-4);
}
</style>
