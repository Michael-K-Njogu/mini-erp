import { apiClient } from '../api/apiClient'
import { ORDER_STATUS } from '../constants/orderStatuses'

const PAGE_SIZE = 1000

async function getAll(resource, params, signal) {
  const rows = []
  let total
  const ids = new Set()
  for (;;) {
    if (rows.length) params.set('id', `gt.${rows[rows.length - 1].id}`)
    params.set('limit', PAGE_SIZE)
    const { data, response } = await apiClient.getRaw(`/${resource}?${params}`, {
      headers: { Prefer: 'count=exact' },
      signal,
    })
    const range = response.headers.get('content-range')
    const count = range?.split('/')[1]
    if (!Array.isArray(data) || !count || !/^\d+$/.test(count)) {
      throw new Error(`Unable to verify the complete ${resource} dataset.`)
    }
    if (total !== undefined && total - rows.length !== Number(count)) {
      throw new Error(`${resource} changed while loading. Please retry.`)
    }
    if (total === undefined) total = Number(count)
    for (const row of data) {
      if (row.id == null || ids.has(row.id)) {
        throw new Error(`Unable to verify the complete ${resource} dataset.`)
      }
      ids.add(row.id)
    }
    rows.push(...data)
    if (rows.length === total) return rows
    if (!data.length || rows.length > total) throw new Error(`Unable to load all ${resource}.`)
  }
}

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
