import { supabase } from '../api/supabaseClient'

const bucket = 'product-images'
const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png' }

export async function uploadProductImage(file) {
  if (!(file instanceof File) || !extensions[file.type] || file.size > 2 * 1024 * 1024) {
    throw new Error('Please upload a JPG or PNG image up to 2MB.')
  }
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session) throw new Error('Sign in to upload product images.')
  if (data.session.user.is_anonymous) {
    throw new Error('Product image uploads are unavailable in demo accounts.')
  }
  const path = `${data.session.user.id}/${crypto.randomUUID()}.${extensions[file.type]}`
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file)
  if (uploadError) throw uploadError
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

// Cleanup must not report a successful product save as a failure.
export async function deleteProductImage(url) {
  if (!url) return
  const prefix = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucket}/`
  if (!url.startsWith(prefix)) return
  try {
    const { error } = await supabase.storage.from(bucket).remove([url.slice(prefix.length)])
    if (error) console.warn('Product image cleanup failed:', error.message)
  } catch (error) {
    console.warn('Product image cleanup failed:', error.message)
  }
}
