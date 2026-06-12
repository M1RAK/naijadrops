import type { SupabaseClient } from '@supabase/supabase-js'
import type { DbUser, DbVendor, DbRider } from '@/types/database.types'

// ─── Profile shapes ───────────────────────────────────────────────────────────

export interface UserPortals {
  user: DbUser
  vendor: DbVendor | null
  rider: DbRider | null
  isApprovedRider: boolean
  isPendingRider: boolean
  isAdmin: boolean
}

// ─── Core profile fetch ───────────────────────────────────────────────────────

/**
 * Fetch everything needed to route and render for the current user.
 * Returns null if the user is not authenticated.
 */
export async function getUserPortals(
  supabase: SupabaseClient
): Promise<UserPortals | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const [userResult, vendorResult, riderResult, adminResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('vendors').select('*').eq('user_id', user.id).single(),
    supabase.from('riders').select('*').eq('user_id', user.id).single(),
    supabase.from('admin_users').select('id, is_active').eq('id', user.id).single()
  ])

  if (!userResult.data) return null

  const rider = riderResult.data as DbRider | null

  return {
    user: userResult.data as DbUser,
    vendor: vendorResult.data as DbVendor | null,
    rider,
    isApprovedRider: rider?.status === 'approved',
    isPendingRider:  rider?.status === 'pending',
    isAdmin: !!(adminResult.data?.is_active)
  }
}

// ─── Profile mutations ────────────────────────────────────────────────────────

/**
 * Update the user's display name and avatar.
 */
export async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: { name?: string; avatar_url?: string }
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)

  if (error) throw new Error(`Failed to update profile: ${error.message}`)
}

/**
 * Ensure a users row exists for this user.
 *
 * The DB trigger (handle_new_user) creates this automatically at signup,
 * so this function is a safety net for edge cases (e.g. existing users
 * from before the trigger was added, or test environments).
 *
 * Safe to call multiple times — upsert is a no-op if the row exists.
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  userId: string,
  defaults: { name?: string | null; role?: string } = {}
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .upsert(
      {
        id: userId,
        name: defaults.name ?? null,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )

  if (error) {
    // Log but don't throw — the trigger should have handled this,
    // and a missing users row will surface as a more specific error downstream
    console.error('[ensureUserProfile] upsert failed:', error.message)
  }
}

/**
 * Ensure a vendor profile exists for this user.
 * Safe to call multiple times — upsert is a no-op if the row exists.
 */
export async function ensureVendorProfile(
  supabase: SupabaseClient,
  userId: string,
  businessName?: string
): Promise<DbVendor> {
  const { data, error } = await supabase
    .from('vendors')
    .upsert(
      { user_id: userId, business_name: businessName ?? null },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to ensure vendor profile: ${error?.message}`)
  }
  return data as DbVendor
}

// ─── Routing helpers ──────────────────────────────────────────────────────────

/**
 * Returns the correct redirect path after login based on UserPortals.
 */
export function getPortalPath(portals: UserPortals): string {
  if (portals.isAdmin) return '/ops-terminal/dashboard'
  if (portals.rider)   return '/rider'
  return '/dashboard'
}

/**
 * Returns the correct redirect path for a role string.
 * Kept for compatibility with files that haven't migrated to getUserPortals yet.
 *
 * @deprecated Use getPortalPath(getUserPortals()) instead.
 */
export function getRoleRedirectPath(role: string): string {
  switch (role) {
    case 'admin':  return '/ops-terminal/dashboard'
    case 'rider':  return '/rider'
    default:       return '/dashboard'
  }
}

// ─── Admin validation ─────────────────────────────────────────────────────────

/**
 * Server-side only. Validates the current user is an active admin.
 * Throws if not authorised — callers should catch and redirect.
 */
export async function validateAdminUser(
  supabase: SupabaseClient,
  requiredRole: 'admin' | 'super_admin' = 'admin'
): Promise<{ userId: string; adminRecord: Record<string, unknown> }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized — authentication required')
  }

  if (!user.email?.toLowerCase().endsWith('@naijadrops.tech')) {
    throw new Error('Unauthorized — corporate domain required')
  }

  const { data: adminRecord, error: dbError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (dbError || !adminRecord || !adminRecord.is_active) {
    throw new Error('Unauthorized — admin clearance required')
  }

  if (requiredRole === 'super_admin' && !adminRecord.is_super_admin) {
    throw new Error('Forbidden — super admin access only')
  }

  return { userId: user.id, adminRecord }
}
