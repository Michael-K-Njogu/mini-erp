import { supabase } from '../api/supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const CUSTOMER_IMAGE_BUCKET = 'customer-images'

async function getAuthorizationHeader({ upload = false } = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session?.access_token) {
    throw new Error('You must be signed in to manage customer images.')
  }
  if (upload && data.session.user?.is_anonymous) {
    throw new Error('Customer image uploads are unavailable in demo accounts.')
  }
  return `Bearer ${data.session.access_token}`
}

export async function uploadCustomerImage(customerId, file) {
  if (!(file instanceof File)) {
    throw new Error('A valid image file is required.')
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'

  const filePath = `${customerId}/logo-${crypto.randomUUID()}.${extension}`
  const authorization = await getAuthorizationHeader({ upload: true })

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${CUSTOMER_IMAGE_BUCKET}/${filePath}`,
    {
      method: 'POST',
      headers: {
        apikey: API_KEY,
        Authorization: authorization,
        'Content-Type': file.type,
        'x-upsert': 'false',
      },
      body: file,
    },
  )

  const data = response.status === 204 ? null : await response.json()

  if (!response.ok) {
    console.error('Customer image upload failed:', {
      status: response.status,
      data,
      filePath,
      fileType: file.type,
    })

    throw new Error(data?.message || data?.error || `Image upload failed (${response.status}).`)
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${CUSTOMER_IMAGE_BUCKET}/${filePath}`
}

export async function replaceCustomerImage(customerId, file) {
  return uploadCustomerImage(customerId, file)
}

export async function deleteCustomerImage(imageUrl) {
  if (!imageUrl) return

  const marker = `/storage/v1/object/public/${CUSTOMER_IMAGE_BUCKET}/`

  const markerIndex = imageUrl.indexOf(marker)

  if (markerIndex === -1) {
    throw new Error('Invalid customer image URL.')
  }

  const filePath = imageUrl.substring(markerIndex + marker.length)
  const authorization = await getAuthorizationHeader()

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${CUSTOMER_IMAGE_BUCKET}/${filePath}`,
    {
      method: 'DELETE',
      headers: {
        apikey: API_KEY,
        Authorization: authorization,
      },
    },
  )

  const data = response.status === 204 ? null : await response.json()

  if (!response.ok) {
    const message = data?.message || data?.error || ''

    if (response.status === 404 || message.toLowerCase().includes('object not found')) {
      console.warn('Customer image was already absent from storage:', filePath)

      return
    }

    console.error('Customer image deletion failed:', {
      status: response.status,
      data,
      filePath,
    })

    throw new Error(message || `Image deletion failed (${response.status}).`)
  }
}
