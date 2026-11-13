<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { STOCK_MOVEMENT_OPTIONS } from '../../constants/stockMovement'
import BaseButton from '../base/BaseButton.vue'

const props = defineProps({
  open: Boolean,
  loading: Boolean,
  product: Object,
  availableQuantity: Number,
  error: { type: String, default: '' },
})

const emit = defineEmits(['close', 'submit'])

const movementType = ref('stock_in')
const quantity = ref(null)
const reason = ref('')
const notes = ref('')
const dialog = ref(null)
const movementSelect = ref(null)
let previousFocus = null

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previousFocus = document.activeElement
      movementType.value = 'stock_in'
      quantity.value = null
      reason.value = ''
      notes.value = ''
      await nextTick()
      if (props.open) movementSelect.value?.focus()
    } else {
      const focus = previousFocus
      previousFocus = null
      await nextTick()
      if (!props.open && focus?.isConnected) focus.focus()
    }
  },
  { immediate: true },
)

function submit() {
  if (props.loading) return
  emit('submit', {
    movementType: movementType.value,
    quantity: Number(quantity.value),
    reason: reason.value.trim(),
    notes: notes.value.trim(),
  })
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (!props.loading) emit('close')
    return
  }
  if (event.key !== 'Tab') return
  const controls = [...dialog.value.querySelectorAll('form *')].filter(
    (element) => element.matches('button, select, input, textarea') && !element.disabled,
  )
  if (!controls.length) {
    event.preventDefault()
    return
  }
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onBeforeUnmount(() => {
  if (previousFocus?.isConnected) previousFocus.focus()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop stock-adjustment-backdrop">
      <section
        ref="dialog"
        class="modal stock-adjustment"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjustment-title"
        aria-describedby="adjustment-summary"
        @keydown="handleKeydown"
      >
        <header class="modal-header stock-adjustment__header">
          <div>
            <h2 id="adjustment-title">Adjust Stock</h2>
            <p>Record a stock movement for this product.</p>
          </div>
        </header>

        <form @submit.prevent="submit">
          <div class="modal-body stock-adjustment__body">
            <div id="adjustment-summary" class="stock-adjustment__summary">
              <div>
                <span>Product</span>
                <strong>{{ product?.name }}</strong>
              </div>
              <div>
                <span>Available stock</span>
                <strong>{{ availableQuantity }}</strong>
              </div>
            </div>

            <p v-if="error" class="stock-adjustment__error" role="alert">{{ error }}</p>

            <div class="stock-adjustment__grid">
              <div class="stock-adjustment__field">
                <label for="movement-type">Movement type</label>
                <select
                  id="movement-type"
                  ref="movementSelect"
                  v-model="movementType"
                  :disabled="loading"
                  required
                >
                  <option
                    v-for="option in STOCK_MOVEMENT_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
              <div class="stock-adjustment__field">
                <label for="quantity">Quantity</label>
                <input
                  id="quantity"
                  v-model.number="quantity"
                  type="number"
                  min="0.001"
                  step="any"
                  :disabled="loading"
                  required
                />
              </div>
            </div>

            <div class="stock-adjustment__field">
              <label for="reason">Reason</label>
              <textarea id="reason" v-model="reason" rows="3" :disabled="loading" required />
            </div>

            <div class="stock-adjustment__field">
              <label for="notes">Notes (optional)</label>
              <textarea id="notes" v-model="notes" rows="3" :disabled="loading" />
            </div>
          </div>

          <footer class="modal-footer stock-adjustment__footer">
            <BaseButton
              label="Cancel"
              variant="secondary"
              :disabled="loading"
              @click="emit('close')"
            />
            <BaseButton
              :label="loading ? 'Saving...' : 'Confirm Adjustment'"
              type="submit"
              :disabled="loading"
            />
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.stock-adjustment-backdrop {
  box-sizing: border-box;
  padding: var(--space-4);
}

.stock-adjustment {
  max-height: calc(100dvh - 2 * var(--space-4));
  overflow-y: auto;
  box-shadow: var(--shadow-default);
}

.stock-adjustment__header h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-lg);
}

.stock-adjustment__header p {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.stock-adjustment__body,
.stock-adjustment__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stock-adjustment__body {
  gap: var(--space-4);
}

.stock-adjustment__summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-bg-default);
}

.stock-adjustment__summary div {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stock-adjustment__summary span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.stock-adjustment__summary strong {
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
}

.stock-adjustment__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.stock-adjustment__field label {
  margin: 0;
}

.stock-adjustment__field textarea {
  min-height: 80px;
}

.stock-adjustment__error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-feedback-error-subtle);
  color: var(--color-feedback-error);
}

.stock-adjustment__footer {
  flex-wrap: wrap;
  margin-top: 0;
}

@media (max-width: 480px) {
  .stock-adjustment__grid {
    grid-template-columns: 1fr;
  }
}
</style>
