import { apiClient } from '../api/apiClient'

const INVENTORY_FIELDS = `
  id,
  product_id,
  quantity_on_hand,
  quantity_reserved,
  reorder_level,
  created_at,
  updated_at,
  product:products (
    id,
    name,
    sku
  )
`

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

  params.set(
    'select',
    'id,product_id,quantity_on_hand,quantity_reserved,reorder_level,created_at,updated_at',
  )
  params.set('order', 'created_at.desc')

  const inventoryData = await apiClient.get(`/inventory?${params.toString()}`)

  if (!inventoryData.length) {
    return []
  }

  // Get the product IDs referenced by inventory
  const productIds = [...new Set(inventoryData.map((item) => item.product_id).filter(Boolean))]

  let products = []

  if (productIds.length) {
    const productParams = new URLSearchParams()

    productParams.set('select', 'id,name,sku')
    productParams.set('id', `in.(${productIds.join(',')})`)

    products = await apiClient.get(`/products?${productParams.toString()}`)
  }

  // Create a quick lookup by product ID
  const productsById = new Map(products.map((product) => [product.id, product]))

  let inventory = inventoryData.map((item) => {
    const product = productsById.get(item.product_id)

    return {
      id: item.id,
      productId: item.product_id,

      product: product
        ? {
            id: product.id,
            name: product.name,
            sku: product.sku,
          }
        : null,

      quantityOnHand: Number(item.quantity_on_hand ?? 0),
      quantityReserved: Number(item.quantity_reserved ?? 0),
      reorderLevel: Number(item.reorder_level ?? 0),

      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }
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

  const product = products[0] || null

  return {
    id: item.id,
    productId: item.product_id,

    product: product
      ? {
          id: product.id,
          name: product.name,
          sku: product.sku,
        }
      : null,

    quantityOnHand: Number(item.quantity_on_hand ?? 0),
    quantityReserved: Number(item.quantity_reserved ?? 0),
    reorderLevel: Number(item.reorder_level ?? 0),

    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}
