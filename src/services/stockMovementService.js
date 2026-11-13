import { getAll } from './paginatedService'

const STOCK_MOVEMENT_FIELDS = `
  id,
  product_id,
  movement_type,
  quantity,
  reference_type,
  reference_id,
  reason,
  notes,
  created_by,
  created_at
`

function mapStockMovement(movement) {
  return {
    id: movement.id,
    productId: movement.product_id,
    movementType: movement.movement_type,
    quantity: Number(movement.quantity ?? 0),
    referenceType: movement.reference_type,
    referenceId: movement.reference_id,
    reason: movement.reason,
    notes: movement.notes,
    createdBy: movement.created_by,
    createdAt: movement.created_at,
  }
}

export async function getStockMovements(productId) {
  const params = new URLSearchParams()

  params.set('select', STOCK_MOVEMENT_FIELDS)
  params.set('product_id', `eq.${productId}`)
  params.set('order', 'id.asc')

  const data = await getAll('stock_movements', params)

  return data.map(mapStockMovement).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}
