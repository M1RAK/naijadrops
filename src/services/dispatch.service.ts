import type { SupabaseClient } from '@supabase/supabase-js'
import type { DbOrder, DbRider } from '@/types/database.types'
import type { ScoredRider } from '@/types/domain.types'
import { getOnlineRiders } from './riders.service'
import { assignRiderToOrder } from './orders.service'
import { APP_CONFIG, KANO_BOUNDS } from '@/utils/constants'

// ─── Config ───────────────────────────────────────────────────────────────────

const SCORING_WEIGHTS = {
	ACCEPTANCE_RATE: 0.4,
	RATING: 0.3,
	PROXIMITY: 0.3
} as const

const MAX_RIDER_RANGE_KM = 5

// ─── Geofence ─────────────────────────────────────────────────────────────────

/**
 * Check whether a coordinate pair is within the Kano pilot zone.
 */
export function isWithinKano(lat: number, lng: number): boolean {
	return (
		lat >= KANO_BOUNDS.minLat &&
		lat <= KANO_BOUNDS.maxLat &&
		lng >= KANO_BOUNDS.minLng &&
		lng <= KANO_BOUNDS.maxLng
	)
}

// ─── Distance ─────────────────────────────────────────────────────────────────

/**
 * Haversine distance between two coordinates in kilometres.
 * Returns a large number (999) when coordinates are missing so
 * riders without location data always sort to the bottom.
 */
function haversineKm(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): number {
	if (!lat1 || !lng1 || !lat2 || !lng2) return 999

	const R = 6371
	const dLat = ((lat2 - lat1) * Math.PI) / 180
	const dLng = ((lng2 - lng1) * Math.PI) / 180
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLng / 2) ** 2
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
	return R * c
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Score a rider for a given order.
 *
 * Formula:
 *   score = (acceptance_rate × 0.4)
 *         + (rating          × 0.3)
 *         + (proximityScore  × 0.3)
 *         + fairnessBonus
 *
 * proximityScore: 1.0 at 0km, 0.0 at 5km, never negative
 * fairnessBonus:  1 / (jobs_today + 1) — rewards less-busy riders
 */
function scoreRider(rider: DbRider, distanceKm: number): number {
	const proximityScore = Math.max(0, 1 - distanceKm / MAX_RIDER_RANGE_KM)
	const fairnessBonus = 1 / (rider.orders_completed_today + 1)

	return (
		rider.acceptance_rate * SCORING_WEIGHTS.ACCEPTANCE_RATE +
		rider.rating * SCORING_WEIGHTS.RATING +
		proximityScore * SCORING_WEIGHTS.PROXIMITY +
		fairnessBonus
	)
}

// ─── Main dispatch function ───────────────────────────────────────────────────

/**
 * Find the best available rider for an order.
 *
 * Steps:
 * 1. Validate the order is within the Kano pilot zone
 * 2. Fetch online riders with the right vehicle type
 * 3. Filter out riders with no known location
 * 4. Score and rank them
 * 5. Return the top scorer
 *
 * Returns null (not throws) when no riders are available,
 * so the caller can handle it gracefully.
 */
export async function getBestRider(
	supabase: SupabaseClient,
	order: DbOrder
): Promise<{ rider: ScoredRider | null; reason?: string }> {
	// Geofence check
	if (!isWithinKano(order.pickup_lat, order.pickup_lng)) {
		return {
			rider: null,
			reason: 'NaijaDrops is currently in Kano pilot zone only.'
		}
	}

	// Get candidates
	const riders = await getOnlineRiders(
		supabase,
		order.vehicle_type,
		APP_CONFIG.RIDER_ACTIVE_WINDOW_MS
	)

	if (!riders.length) {
		return { rider: null, reason: 'No riders currently online.' }
	}

	// Score each rider
	const scored: ScoredRider[] = riders
		.filter((r) => r.current_lat !== null && r.current_lng !== null)
		.map((rider) => {
			const distance = haversineKm(
				order.pickup_lat,
				order.pickup_lng,
				rider.current_lat!,
				rider.current_lng!
			)
			return {
				...rider,
				distance,
				score: scoreRider(rider, distance)
			}
		})

	if (!scored.length) {
		return {
			rider: null,
			reason: 'No riders with known location found nearby.'
		}
	}

	// Sort descending by score
	scored.sort((a, b) => b.score - a.score)

	return { rider: scored[0] }
}

/**
 * Run the full dispatch flow for an order:
 * 1. Find the best rider
 * 2. Lock the order to that rider
 *
 * Returns the matched rider id on success, or an error message on failure.
 */
export async function dispatchOrder(
	supabase: SupabaseClient,
	order: DbOrder
): Promise<
	{ success: true; riderId: string } | { success: false; message: string }
> {
	const { rider, reason } = await getBestRider(supabase, order)

	if (!rider) {
		return { success: false, message: reason ?? 'No rider available.' }
	}

	try {
		await assignRiderToOrder(supabase, order.id, rider.user_id)
		return { success: true, riderId: rider.user_id }
	} catch (err) {
		const message =
			err instanceof Error ? err.message : 'Assignment failed.'
		return { success: false, message }
	}
}
