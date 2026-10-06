<script setup>
import { getCustomerTypeLabel } from '../../constants/customerTypes.js'
import BaseBadge from '../base/BaseBadge.vue'
import { Mail, Phone } from '@lucide/vue'

defineProps({
  customer: {
    type: Object,
    required: true,
  },
})

function getInitials(name) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) || []

  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function customerTypeLabel(type) {
  return getCustomerTypeLabel(type) || 'Customer'
}
</script>

<template>
  <section class="customer-profile-card">
    <div class="customer-avatar">
      <img v-if="customer.image" :src="customer.image" :alt="customer.name || 'Customer'" />
      <span v-else aria-label="Customer initials">{{ getInitials(customer.name) }}</span>
    </div>

    <div class="customer-profile-summary">
      <div class="customer-profile-heading">
        <h2>{{ customer.name || 'Unnamed customer' }}</h2>
      </div>

      <div class="customer-profile-meta">
        <span v-if="customer.customerNumber" class="customer-number">
          {{ customer.customerNumber }}
        </span>
      </div>
    </div>

    <div class="customer-profile-links" aria-label="Quick contact">
      <a v-if="customer.email" :href="`mailto:${customer.email}`">
        <Mail :size="16" aria-hidden="true" />
        <span>Email</span>
      </a>
      <a v-if="customer.phonePrimary" :href="`tel:${customer.phonePrimary}`">
        <Phone :size="16" aria-hidden="true" />
        <span>Call</span>
      </a>
    </div>
  </section>
</template>

<style scoped>
.customer-profile-card {
  align-items: center;
  background: var(--bg-colour-white);
  border: 1px solid var(--border-colour-subtle);
  border-radius: var(--border-radius-lg);
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 24px 20px;
  text-align: center;
}

.customer-avatar {
  align-items: center;
  background: var(--bg-info-muted);
  border: 1px solid var(--border-info);
  border-radius: 50%;
  color: var(--text-colour-accent);
  display: flex;
  flex: 0 0 72px;
  font-size: 24px;
  font-weight: 600;
  height: 72px;
  justify-content: center;
  overflow: hidden;
  width: 72px;
}

.customer-avatar img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.customer-profile-summary {
  min-width: 0;
  width: 100%;
}

.customer-profile-heading {
  align-items: center;
  display: grid;
  justify-items: center;
  gap: 10px;
}

.customer-profile-heading h2 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
  margin: 0;
  overflow-wrap: anywhere;
}

.customer-profile-meta {
  color: var(--text-colour-secondary);
  display: flex;
  flex-direction: column;
  font-size: 13px;
  gap: 8px;
  margin-top: 12px;
}

.customer-profile-meta span {
  background: var(--bg-colour-default);
  border-radius: var(--border-radius-full);
  padding: 4px 9px;
}

.customer-profile-meta .customer-number {
  background: var(--bg-info-muted);
  color: var(--text-colour-accent);
  font-weight: 600;
}

.customer-profile-links {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.customer-profile-links a {
  align-items: center;
  border: 1px solid var(--border-colour-default);
  border-radius: var(--border-radius-md);
  color: var(--text-colour-accent);
  display: flex;
  font-size: 13px;
  gap: 7px;
  justify-content: center;
  padding: 9px 12px;
  text-decoration: none;
  width: 100%;
}

.customer-profile-links a:hover {
  background: var(--bg-info-muted);
}

@media (max-width: 700px) {
  .customer-profile-card {
    align-items: center;
    flex-direction: row;
    padding: 18px;
    text-align: left;
  }

  .customer-profile-summary {
    flex: 1;
  }

  .customer-profile-heading {
    justify-items: start;
  }

  .customer-profile-meta {
    flex-direction: row;
    margin-top: 8px;
  }

  .customer-profile-links {
    border-top: 0;
    flex: 0 0 auto;
    padding-top: 0;
    width: auto;
  }

  .customer-profile-links a {
    width: auto;
  }
}

@media (max-width: 520px) {
  .customer-profile-card {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .customer-profile-summary {
    flex-basis: calc(100% - 100px);
  }

  .customer-profile-links {
    border-top: 1px solid var(--border-colour-subtle);
    flex-basis: 100%;
    flex-direction: row;
    padding-top: 14px;
  }

  .customer-profile-links a {
    flex: 1;
  }
}
</style>
