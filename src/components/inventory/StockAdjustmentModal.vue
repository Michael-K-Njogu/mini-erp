<script setup>
import { ref, watch } from 'vue'
import { STOCK_MOVEMENT_OPTIONS } from '../../constants/stockMovement'

const props = defineProps({
  open: Boolean,
  loading: Boolean,
  product: Object,
  availableQuantity: Number,
})

const emit = defineEmits(['close', 'submit'])

const movementType = ref('stock_in')
const quantity = ref(null)
const reason = ref('')
const notes = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) return

    movementType.value = 'stock_in'
    quantity.value = null
    reason.value = ''
    notes.value = ''
  },
)

function submit() {
  emit('submit', {
    movementType: movementType.value,
    quantity: Number(quantity.value),
    reason: reason.value.trim(),
    notes: notes.value.trim(),
  })
}
</script>

<template>
  <div v-if="open" class="modal-backdrop">
    <section
      class="modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjustment-title"
    >
      <h2 id="adjustment-title">Adjust Stock</h2>

      <p>{{ product?.name }}</p>

      <p>
        Available stock:
        <strong>{{ availableQuantity }}</strong>
      </p>

      <form @submit.prevent="submit">
        <label for="movement-type">Movement type</label>
        <select id="movement-type" v-model="movementType" required>
          <option
            v-for="option in STOCK_MOVEMENT_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>

        <label for="quantity">Quantity</label>
        <input
          id="quantity"
          v-model.number="quantity"
          type="number"
          min="0.001"
          step="any"
          required
        />

        <label for="reason">Reason</label>
        <textarea id="reason" v-model="reason" required />

        <label for="notes">Notes (optional)</label>
        <textarea id="notes" v-model="notes" />

        <div class="modal-actions">
          <button type="button" :disabled="loading" @click="emit('close')">Cancel</button>

          <button type="submit" :disabled="loading">
            {{ loading ? 'Saving...' : 'Confirm Adjustment' }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
