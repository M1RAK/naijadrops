import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Generate a short-lived signed URL for a private storage object.
 * Use this anywhere a riders.id_card_url / license_url / vehicle_photo_url
 * path needs to be rendered as an actual fetchable URL.
 *
 * @param path - The storage path as stored in the DB (e.g. "user-id/id_card_123.jpg")
 * @param expiresIn - Seconds until the URL expires (default 10 minutes)
 */
export async function getSignedUrl(
	supabase: SupabaseClient,
	path: string | null,
	expiresIn = 60 * 10
): Promise<string | null> {
	if (!path) return null

	const { data, error } = await supabase.storage
		.from('documents')
		.createSignedUrl(path, expiresIn)

	if (error) {
		console.error('[storage] Failed to sign URL:', error.message)
		return null
	}

	return data.signedUrl
}

/**
 * Generate signed URLs for all three rider verification documents at once.
 * Convenience wrapper for the ops-terminal driver detail page.
 */
export async function getRiderDocumentUrls(
	supabase: SupabaseClient,
	rider: {
		id_card_url: string | null
		license_url: string | null
		vehicle_photo_url: string | null
	}
): Promise<{
	idCard: string | null
	license: string | null
	vehiclePhoto: string | null
}> {
	const [idCard, license, vehiclePhoto] = await Promise.all([
		getSignedUrl(supabase, rider.id_card_url),
		getSignedUrl(supabase, rider.license_url),
		getSignedUrl(supabase, rider.vehicle_photo_url)
	])

	return { idCard, license, vehiclePhoto }
}
