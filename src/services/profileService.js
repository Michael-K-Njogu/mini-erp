import { supabase } from '../api/supabaseClient'

export async function getProfileById(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    const missing = new Error(
      'Your profile could not be found or accessed. Contact an administrator to check your account profile.',
    )
    missing.code = 'PROFILE_UNAVAILABLE'
    throw missing
  }

  return data
}

export async function updateProfile(userId, values, updatedAt) {
  let query = supabase
    .from('profiles')
    .update({
      display_name: values.displayName,
      phone_number: values.phoneNumber || null,
      avatar_path: values.avatarPath || null,
    })
    .eq('id', userId)

  query = updatedAt === null ? query.is('updated_at', null) : query.eq('updated_at', updatedAt)
  const { data, error } = await query.select().maybeSingle()
  if (error) throw error
  if (!data) {
    throw new Error('Your profile changed or is unavailable. Reload it before saving again.')
  }
  return data
}

const PROFILE_IMAGE_BUCKET = 'profile-images'
export const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024
const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export function validateProfileImage(file) {
  if (!file || !extensions[file.type]) {
    throw new Error('Choose a JPEG, PNG, or WebP image.')
  }
  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    throw new Error('Profile images must be 2 MB or smaller.')
  }
}

export async function uploadProfileImage(userId, file) {
  validateProfileImage(file)
  const path = `${userId}/${crypto.randomUUID()}.${extensions[file.type]}`
  const { error } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return path
}

export async function getProfileImageUrl(path) {
  const { data, error } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

export async function deleteProfileImage(path) {
  const { error } = await supabase.storage.from(PROFILE_IMAGE_BUCKET).remove([path])
  if (error) throw error
}
