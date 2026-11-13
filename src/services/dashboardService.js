import { ORDER_STATUS } from '../constants/orderStatuses'
import { getAll } from './paginatedService'

export async function getDashboardOrders({ since, until, signal, includeCustomerNames = true }) {
  const params = new URLSearchParams({
    select: `id,order_number,customer_id,${includeCustomerNames ? 'customers(name),' : ''}total_amount,status,created_at,completed_at`,
    or: `(and(created_at.gte.${since.toISOString()},created_at.lt.${until.toISOString()}),and(completed_at.gte.${since.toISOString()},completed_at.lt.${until.toISOString()}),status.in.(${ORDER_STATUS.PENDING},${ORDER_STATUS.PROCESSING}))`,
    order: 'id.asc',
  })
  const data = await getAll('orders', params, signal)
  return data.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    customerId: order.customer_id,
    customerName: order.customers?.name || '',
    grandTotal: Number(order.total_amount || 0),
    status: order.status,
    createdAt: order.created_at,
    completedAt: order.completed_at,
  }))
}

export async function getDashboardCustomers({ since, until, signal }) {
  const params = new URLSearchParams({
    select: 'id,name,created_at',
    created_at: `gte.${since.toISOString()}`,
    and: `(created_at.lt.${until.toISOString()})`,
    order: 'id.asc',
  })
  return (await getAll('customers', params, signal)).map((customer) => ({
    id: customer.id,
    name: customer.name,
    createdAt: customer.created_at,
  }))
}

export async function getDashboardInventory({ signal }) {
  const params = new URLSearchParams({
    select: 'id,quantity_on_hand,quantity_reserved,reorder_level',
    order: 'id.asc',
  })
  return (await getAll('inventory', params, signal)).map((item) => ({
    quantityOnHand: Number(item.quantity_on_hand ?? 0),
    quantityReserved: Number(item.quantity_reserved ?? 0),
    reorderLevel: Number(item.reorder_level ?? 0),
  }))
}
