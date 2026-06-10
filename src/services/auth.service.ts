import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/types/database.types'
import type { UserProfile } from '@/types/domain.types'

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * Fetch the full user profile including their role-specific sub-profile.
 *
 * This replaces getUserRole() in src/utils/auth.js.
 * Key improvement: vendor and rider sub-profiles are fetched in parallel
 * instead of sequentially.
 *
 * Returns null if the user is not authenticated.
 */
export async function getUserProfile(
	supabase: SupabaseClient
): Promise<UserProfile | null> {
	const {
		data: { user },
		error: authError
	} = await supabase.auth.getUser()

	if (authError || !user) return null

	// Fetch the unified users table row
	const { data: userProfile, error: profileError } = await supabase
		.from('users')
		.select('*')
		.eq('id', user.id)
		.maybeSingle()

	if (profileError || !userProfile) return null

	// Fetch vendor and rider sub-profiles in parallel — no sequential waterfall
	const [vendorResult, riderResult] = await Promise.all([
		userProfile.role === 'vendor'
			? supabase
					.from('vendors')
					.select('*')
					.eq('user_id', user.id)
					.maybeSingle()
			: Promise.resolve({ data: null }),
		userProfile.role === 'rider'
			? supabase
					.from('riders')
					.select('*')
					.eq('user_id', user.id)
					.maybeSingle()
			: Promise.resolve({ data: null })
	])

	return {
		...userProfile,
		vendor: vendorResult.data,
		rider: riderResult.data
	} as UserProfile
}

/**
 * Ensure a user row exists in the public users table.
 * Called after OAuth sign-in where the trigger may not have fired yet.
 */
export async function ensureUserProfile(
	supabase: SupabaseClient,
	userId: string,
	defaults: { role?: UserRole; name?: string | null } = {}
): Promise<void> {
	const { data: existing, error: readError } = await supabase
		.from('users')
		.select('id')
		.eq('id', userId)
		.maybeSingle()

	if (readError) {
		throw new Error(`Failed to check profile state: ${readError.message}`)
	}

	if (existing) return

	const { error: insertError } = await supabase.from('users').insert({
		id: userId,
		role: defaults.role ?? 'vendor',
		name: defaults.name ?? null
	})

	if (insertError && !insertError.message.includes('duplicate key value')) {
		throw new Error(`Failed to create profile: ${insertError.message}`)
	}
}

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

// ─── Routing ──────────────────────────────────────────────────────────────────

/**
 * Returns the correct redirect path for a given role.
 * Used by /resolve and the auth callback.
 */
export function getRoleRedirectPath(role: UserRole): string {
	const paths: Record<UserRole, string> = {
		admin: '/ops-terminal/dashboard',
		vendor: '/dashboard',
		rider: '/rider'
	}
	return paths[role] ?? '/resolve'
}

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * Validate that the current user is an active admin.
 * Checks both email domain and the admin_users DB table.
 *
 * This is a server-side only function — it uses the server supabase client.
 * Throws if the user is not authorised.
 */
export async function validateAdminUser(
	supabase: SupabaseClient,
	requiredRole: 'admin' | 'super_admin' = 'admin'
): Promise<{ userId: string; adminRecord: Record<string, unknown> }> {
	const {
		data: { user },
		error: authError
	} = await supabase.auth.getUser()

	if (authError || !user) {
		throw new Error('Unauthorized — authentication required')
	}

	// Domain check
	if (!user.email?.toLowerCase().endsWith('@naijadrops.tech')) {
		throw new Error('Unauthorized — corporate domain required')
	}

	// DB check — no hardcoded emails
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
