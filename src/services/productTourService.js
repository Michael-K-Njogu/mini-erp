import { supabase } from '../api/supabaseClient'

export const PRODUCT_TOUR_VERSION = 1

export async function getProductTourCompletion(userId) {
  const { data, error } = await supabase
    .from('product_tour_completions')
    .select('completed_version')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.completed_version ?? 0
}

export async function completeProductTour(userId) {
  const { error } = await supabase
    .from('product_tour_completions')
    .upsert({ user_id: userId, completed_version: PRODUCT_TOUR_VERSION })
  if (error) throw error
}
