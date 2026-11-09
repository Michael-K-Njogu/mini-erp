<script setup>
import { watch, onBeforeUnmount } from 'vue'
import BaseButton from './BaseButton.vue'
import { X } from '@lucide/vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },

  title: {
    type: String,
    default: '',
  },

  width: {
    type: String,
    default: '640px',
  },

  noPadding: {
    type: Boolean,
    default: false,
  },

  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },

  showCloseButton: {
    type: Boolean,
    default: true,
  },

  showFooter: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['close'])

function close() {
  emit('close')
}

function onBackdropClick() {
  if (props.closeOnBackdrop) {
    close()
  }
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.open) {
    close()
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKeydown)
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', onKeydown)
      document.body.style.overflow = ''
    }
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-overlay" @click="onBackdropClick">
        <div class="modal" :style="{ maxWidth: width }" @click.stop>
          <div v-if="title || showCloseButton" class="modal-header">
            <h2 class="modal-title">
              {{ title }}
            </h2>

            <button v-if="showCloseButton" class="btn btn-icon btn-secondary" @click="close">
              <X :size="20" />
            </button>
          </div>

          <div :class="['modal-body', { 'modal-body-no-padding': noPadding }]">
            <slot name="body" />
          </div>

          <div v-if="showFooter" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;

  display: flex;
  justify-content: center;
  align-items: center;

  padding: 2rem;

  background: var(--color-bg-scrim);

  z-index: 9999;
}

.modal {
  width: 100%;
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  box-shadow: var(--shadow-default);
  transition: transform 0.2s ease;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: scale(0.96);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 1.125rem;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;

  border: none;
  background: transparent;

  cursor: pointer;

  color: var(--color-text-secondary);
}

.modal-close:hover {
  color: var(--color-text-primary);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .modal-overlay {
    padding: 1rem;
  }
}
</style>
