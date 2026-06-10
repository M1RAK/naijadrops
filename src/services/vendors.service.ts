import type { SupabaseClient } from '@supabase/supabase-js'
import type { DbVendor } from '@/types/database.types'

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch a vendor profile by the auth user id.
 * Returns null if not found.
 */
export async function getVendorByUserId(
	supabase: SupabaseClient,
	userId: string
): Promise<DbVendor | null> {
	const { data, error } = await supabase
		.from('vendors')
		.select('*')
		.eq('user_id', userId)
		.single()

	if (error || !data) return null
	return data as DbVendor
}

/**
 * Get vendors.id for a given auth user id.
 *
 * This is the most commonly needed operation because orders use
 * vendor_id which references vendors.id — not the auth user id.
 *
 * Returns null if the vendor profile doesn't exist yet.
 */
export async function getVendorId(
	supabase: SupabaseClient,
	userId: string
): Promise<string | null> {
	const { data } = await supabase
		.from('vendors')
		.select('id')
		.eq('user_id', userId)
		.single()

	return data?.id ?? null
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a vendor profile for a new user.
 * Uses upsert so it's safe to call even if the profile already exists.
 */
export async function ensureVendorProfile(
	supabase: SupabaseClient,
	userId: string,
	businessName?: string
): Promise<DbVendor> {
	const { data: existing, error: readError } = await supabase
		.from('vendors')
		.select('*')
		.eq('user_id', userId)
		.maybeSingle()

	if (readError) {
		throw new Error(`Failed to check vendor profile: ${readError.message}`)
	}

	if (existing) return existing as DbVendor

	const { data, error } = await supabase
		.from('vendors')
		.insert({
			user_id: userId,
			business_name: businessName ?? 'My Business'
		})
		.select()
		.single()

	if (error && !error.message.includes('duplicate key value')) {
		throw new Error(`Failed to create vendor profile: ${error?.message}`)
	}

	if (data) return data as DbVendor

	const { data: refreshed, error: refreshError } = await supabase
		.from('vendors')
		.select('*')
		.eq('user_id', userId)
		.single()

	if (refreshError || !refreshed) {
		throw new Error(
			`Failed to confirm vendor profile: ${refreshError?.message}`
		)
	}

	return refreshed as DbVendor
}
