import type { SupabaseClient } from '@supabase/supabase-js'
import type {
	DbRider,
	RiderStatus,
	OperationalStatus
} from '@/types/database.types'
import type { RiderWithUser } from '@/types/domain.types'

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch a rider profile by their auth user id.
 * Returns null if not found.
 */
export async function getRiderByUserId(
	supabase: SupabaseClient,
	userId: string
): Promise<DbRider | null> {
	const { data, error } = await supabase
		.from('riders')
		.select('*')
		.eq('user_id', userId)
		.single()

	if (error || !data) return null
	return data as DbRider
}

/**
 * Fetch a rider profile joined with their user account.
 * Used in the ops terminal driver detail view.
 */
export async function getRiderWithUser(
	supabase: SupabaseClient,
	userId: string
): Promise<RiderWithUser | null> {
	const { data, error } = await supabase
		.from('riders')
		.select('*, users(full_name, email, phone)')
		.eq('user_id', userId)
		.single()

	if (error || !data) return null
	return data as RiderWithUser
}

/**
 * Fetch all riders, joined with their user accounts.
 * Used in the ops terminal driver list.
 */
export async function getAllRiders(
	supabase: SupabaseClient
): Promise<RiderWithUser[]> {
	const { data, error } = await supabase
		.from('riders')
		.select('*, users(full_name, email, phone)')
		.order('created_at', { ascending: false })

	if (error || !data) return []
	return data as RiderWithUser[]
}

/**
 * Fetch riders that are currently online and active.
 * Used by the dispatch engine to find candidates.
 *
 * @param vehicleType - filter to a specific vehicle type
 * @param activeWindowMs - how recently the rider must have been seen (default 3 min)
 */
export async function getOnlineRiders(
	supabase: SupabaseClient,
	vehicleType: string,
	activeWindowMs = 3 * 60 * 1000
): Promise<DbRider[]> {
	const cutoff = new Date(Date.now() - activeWindowMs).toISOString()

	const { data, error } = await supabase
		.from('riders')
		.select('*')
		.eq('operational_status', 'online')
		.eq('vehicle_type', vehicleType)
		.gt('last_seen_at', cutoff)

	if (error || !data) return []
	return data as DbRider[]
}

/**
 * Fetch riders flagged for fraud review.
 * Currently flags anyone with a rating below the threshold.
 */
export async function getFlaggedRiders(
	supabase: SupabaseClient,
	ratingThreshold = 4.0,
	limit = 10
): Promise<RiderWithUser[]> {
	const { data, error } = await supabase
		.from('riders')
		.select('*, users(full_name, email)')
		.lt('rating', ratingThreshold)
		.order('rating', { ascending: true })
		.limit(limit)

	if (error || !data) return []
	return data as RiderWithUser[]
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create or update a rider's onboarding profile.
 * Uses upsert so re-submissions don't create duplicate rows.
 */
export async function upsertRiderProfile(
	supabase: SupabaseClient,
	userId: string,
	profileData: Partial<DbRider>
): Promise<void> {
	const { error } = await supabase.from('riders').upsert(
		{
			user_id: userId,
			...profileData,
			status: 'pending',
			documents_submitted_at: new Date().toISOString()
		},
		{ onConflict: 'user_id' }
	)

	if (error) throw new Error(`Failed to save rider profile: ${error.message}`)
}

/**
 * Approve a rider for active duty.
 * Sets both the boolean approved flag and the status enum.
 */
export async function approveRider(
	supabase: SupabaseClient,
	userId: string
): Promise<void> {
	const { error } = await supabase
		.from('riders')
		.update({ approved: true, status: 'approved' })
		.eq('user_id', userId)

	if (error) throw new Error(`Failed to approve rider: ${error.message}`)
}

/**
 * Deactivate a rider — sets them back to pending so they can't receive jobs.
 */
export async function deactivateRider(
	supabase: SupabaseClient,
	userId: string
): Promise<void> {
	const { error } = await supabase
		.from('riders')
		.update({ approved: false, status: 'pending' })
		.eq('user_id', userId)

	if (error) throw new Error(`Failed to deactivate rider: ${error.message}`)
}

/**
 * Suspend a rider — used by the fraud control system.
 */
export async function suspendRider(
	supabase: SupabaseClient,
	userId: string,
	reason: string
): Promise<void> {
	const { error } = await supabase
		.from('riders')
		.update({
			status: 'paused',
			rejection_reason: reason
		})
		.eq('user_id', userId)

	if (error) throw new Error(`Failed to suspend rider: ${error.message}`)
}

/**
 * Update a rider's operational status (online / offline / awaiting_payment).
 */
export async function updateRiderOperationalStatus(
	supabase: SupabaseClient,
	userId: string,
	status: OperationalStatus
): Promise<void> {
	const { error } = await supabase
		.from('riders')
		.update({ operational_status: status })
		.eq('user_id', userId)

	if (error)
		throw new Error(`Failed to update rider status: ${error.message}`)
}

/**
 * Update a rider's live location.
 * Called by the DriverHeartbeat component every 35 seconds.
 */
export async function updateRiderLocation(
	supabase: SupabaseClient,
	riderId: string,
	lat: number,
	lng: number
): Promise<void> {
	// Update the primary riders row (used by the map engine)
	const { error: updateError } = await supabase
		.from('riders')
		.update({
			current_lat: lat,
			current_lng: lng,
			last_seen_at: new Date().toISOString()
		})
		.eq('id', riderId)

	if (updateError)
		throw new Error(`Failed to update location: ${updateError.message}`)

	// Also insert a history record for the spatial index
	await supabase
		.from('rider_locations')
		.insert({ rider_id: riderId, lat, lng })
	// We intentionally don't throw on history insert failure —
	// the primary location update is what matters
}
