import { apiClient } from '../api/apiClient'
import { ORDER_STATUS } from '../constants/orderStatuses'

const ORDER_LIMIT = 5000

/**
 * Fetches the lightweight order fields needed for dashboard metrics: orders
 * created or completed since `since`, plus every open order regardless of age.
 */
export async function getDashboardOrders({ since, signal } = {}) {
  const sinceIso = since.toISOString()
  const openStatuses = [ORDER_STATUS.PENDING, ORDER_STATUS.PROCESSING]

  const params = new URLSearchParams()

  params.set('select', 'id,customer_id,total_amount,status,created_at,completed_at')
  params.set(
    'or',
    `(created_at.gte.${sinceIso},completed_at.gte.${sinceIso},status.in.(${openStatuses.join(',')}))`,
  )
  params.set('limit', ORDER_LIMIT)

  const data = await apiClient.get(`/orders?${params.toString()}`, { signal })

  return data.map((order) => ({
    id: order.id,
    customerId: order.customer_id,
    grandTotal: Number(order.total_amount || 0),
    status: order.status,
    createdAt: order.created_at,
    completedAt: order.completed_at,
  }))
}
