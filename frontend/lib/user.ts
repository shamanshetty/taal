import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '@/types'

/**
 * Map Supabase's auth user object to the app's User shape.
 */
export const mapSupabaseUser = (supabaseUser: SupabaseUser): User => {
  const fullName = (() => {
    const metadataName = supabaseUser.user_metadata?.full_name
    if (typeof metadataName === 'string' && metadataName.trim().length > 0) {
      return metadataName.trim()
    }
    return undefined
  })()

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    full_name: fullName,
    onboarding_complete: Boolean(supabaseUser.user_metadata?.onboarding_complete),
    created_at: supabaseUser.created_at,
    updated_at: supabaseUser.last_sign_in_at ?? supabaseUser.created_at,
  }
}
