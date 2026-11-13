import { apiClient } from '../api/apiClient'

import { uploadProductImage, deleteProductImage } from './productImageService'

const RESOURCE_PATH = '/products'

const SORT_FIELD_MAP = {
  sku: 'sku',
  name: 'name',
  category: 'category',
  sellingPrice: 'selling_price',
  stockQuantity: 'stock_quantity',
  status: 'status',
  createdAt: 'created_at',
}

export const PRODUCT_FIELDS = {
  image: 'image_url',
  id: 'id',
  sku: 'sku',
  name: 'name',
  description: 'description',
  category: 'category',
  unit: 'unit',
  costPrice: 'cost_price',
  sellingPrice: 'selling_price',
  stockQuantity: 'stock_quantity',
  status: 'status',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

function mapProduct(product) {
  return {
    image: product.image_url || null,
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    category: product.category,
    unit: product.unit,
    costPrice: product.cost_price,
    sellingPrice: product.selling_price,
    stockQuantity: product.stock_quantity,
    status: product.status,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  }
}

function mapProductToApi(product) {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description,
    category: product.category,
    unit: product.unit,
    cost_price: product.costPrice,
    selling_price: product.sellingPrice,
    stock_quantity: product.stockQuantity,
    status: product.status,
  }
}

export async function getProducts({
  query = '',
  category = '',
  status = '',
  sort,
  page = 1,
  pageSize = 10,
  signal,
} = {}) {
  const params = new URLSearchParams()

  const offset = (page - 1) * pageSize

  params.set('offset', offset)
  params.set('limit', pageSize)
  params.set('select', '*')

  if (query) {
    params.set('or', `(sku.ilike.*${query}*,name.ilike.*${query}*)`)
  }

  if (category) {
    params.set('category', `eq.${category}`)
  }

  if (status) {
    params.set('status', `eq.${status}`)
  }

  if (sort) {
    const sortField = SORT_FIELD_MAP[sort.field]

    if (sortField) {
      params.set('order', `${sortField}.${sort.direction}`)
    }
  }

  const { data, response } = await apiClient.getRaw(`${RESOURCE_PATH}?${params.toString()}`, {
    headers: {
      Prefer: 'count=exact',
    },
    signal,
  })

  const contentRange = response.headers.get('content-range')

  const total = contentRange ? Number(contentRange.split('/')[1]) : 0

  return {
    data: data.map(mapProduct),
    total,
  }
}

export async function getProductById(id, { signal } = {}) {
  const params = new URLSearchParams()

  params.set('id', `eq.${id}`)

  params.set('select', '*')

  const { data } = await apiClient.getRaw(`${RESOURCE_PATH}?${params.toString()}`, { signal })

  return mapProduct(data[0])
}

export async function createProduct(product) {
  const imageUrl = product.image instanceof File ? await uploadProductImage(product.image) : null
  try {
    const data = await apiClient.post(
      RESOURCE_PATH,
      {
        ...mapProductToApi(product),
        image_url: imageUrl,
      },
      { headers: { Prefer: 'return=representation' } },
    )
    if (!data?.[0]) throw new Error('Product could not be created.')
    return mapProduct(data[0])
  } catch (error) {
    await deleteProductImage(imageUrl)
    throw error
  }
}

export async function updateProduct(id, product) {
  const { stock_quantity: _stockQuantity, ...apiProduct } = mapProductToApi(product)
  const imageChanged = product.image instanceof File || product.image === null
  const existing = imageChanged ? await getProductById(id) : null
  const uploaded = product.image instanceof File ? await uploadProductImage(product.image) : null
  if (imageChanged) apiProduct.image_url = uploaded
  let data
  try {
    data = await apiClient.patch(`${RESOURCE_PATH}?id=eq.${id}`, apiProduct, {
      headers: { Prefer: 'return=representation' },
    })
    if (!data?.[0]) throw new Error('Product could not be updated.')
  } catch (error) {
    await deleteProductImage(uploaded)
    throw error
  }
  if (imageChanged) await deleteProductImage(existing.image)
  return mapProduct(data[0])
}

export async function deleteProduct(id) {
  const product = await getProductById(id)
  await apiClient.delete(`${RESOURCE_PATH}?id=eq.${id}`)
  await deleteProductImage(product.image)
}
