import { apiClient } from '../api/apiClient'
import { getAll } from './paginatedService'

const INVENTORY_FIELDS = `
  id,
  product_id,
  quantity_on_hand,
  quantity_reserved,
  reorder_level,
  created_at,
  updated_at
`

const PRODUCT_BATCH_SIZE = 100

function mapInventoryItem(item) {
  return {
    id: item.id,
    productId: item.product_id,

    product: item.product
      ? {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
        }
      : null,

    quantityOnHand: Number(item.quantity_on_hand ?? 0),
    quantityReserved: Number(item.quantity_reserved ?? 0),
    reorderLevel: Number(item.reorder_level ?? 0),

    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

export async function getInventory({ query = '', status = '' } = {}) {
  const params = new URLSearchParams()

  params.set('select', INVENTORY_FIELDS)
  params.set('order', 'id.asc')
  const inventoryData = await getAll('inventory', params)
  const productIds = [...new Set(inventoryData.map((item) => item.product_id))]
  if (productIds.some((id) => !id)) {
    throw new Error('Inventory contains an item without a product reference.')
  }

  const productsById = new Map()
  for (let offset = 0; offset < productIds.length; offset += PRODUCT_BATCH_SIZE) {
    const ids = productIds.slice(offset, offset + PRODUCT_BATCH_SIZE)
    const productParams = new URLSearchParams({
      select: 'id,name,sku',
      or: `(id.in.(${ids.join(',')}))`,
      order: 'id.asc',
    })
    const products = await getAll('products', productParams)
    for (const product of products) productsById.set(product.id, product)
  }

  let inventory = inventoryData.map((item) => {
    const product = productsById.get(item.product_id)
    if (!product) {
      throw new Error('Unable to load a product linked to inventory. Check product access.')
    }
    return mapInventoryItem({ ...item, product })
  })

  if (query) {
    const normalizedQuery = query.toLowerCase()

    inventory = inventory.filter((item) => {
      return (
        item.product?.name?.toLowerCase().includes(normalizedQuery) ||
        item.product?.sku?.toLowerCase().includes(normalizedQuery)
      )
    })
  }

  if (status) {
    inventory = inventory.filter((item) => {
      const available = getAvailableQuantity(item)

      if (status === 'out-of-stock') {
        return available <= 0
      }

      if (status === 'low-stock') {
        return available > 0 && available <= item.reorderLevel
      }

      if (status === 'in-stock') {
        return available > item.reorderLevel
      }

      return true
    })
  }

  return inventory
}

export function getAvailableQuantity(item) {
  return Math.max(0, item.quantityOnHand - item.quantityReserved)
}

export function getStockStatus(item) {
  const available = getAvailableQuantity(item)

  if (available <= 0) {
    return 'out-of-stock'
  }

  if (available <= item.reorderLevel) {
    return 'low-stock'
  }

  return 'in-stock'
}

export async function getInventoryItem(id) {
  const params = new URLSearchParams()

  params.set(
    'select',
    'id,product_id,quantity_on_hand,quantity_reserved,reorder_level,created_at,updated_at',
  )

  params.set('id', `eq.${id}`)

  const data = await apiClient.get(`/inventory?${params.toString()}`)

  if (!data.length) {
    throw new Error('Inventory item not found.')
  }

  const item = data[0]

  const productParams = new URLSearchParams()

  productParams.set('select', 'id,name,sku')
  productParams.set('id', `eq.${item.product_id}`)

  const products = await apiClient.get(`/products?${productParams.toString()}`)

  if (!products[0]) {
    throw new Error(
      'Unable to load the product linked to this inventory item. Check product access.',
    )
  }
  return mapInventoryItem({ ...item, product: products[0] })
}

export async function adjustStock({ productId, movementType, quantity, reason, notes }) {
  return apiClient.post('/rpc/adjust_stock', {
    p_product_id: productId,
    p_movement_type: movementType,
    p_quantity: Number(quantity),
    p_reason: reason,
    p_notes: notes || null,
  })
}
