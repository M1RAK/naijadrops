import type { DbOrder, DbRider, DbUser, DbVendor } from './database.types'

// ─── Primitives ──────────────────────────────────────────────────────────────

/** A lat/lng pair with a human-readable name */
export interface LocationPoint {
	name: string
	lat: number
	lng: number
}

// ─── Enriched DB objects (joined queries) ────────────────────────────────────

/** Rider row + their auth user record */
export interface RiderWithUser extends DbRider {
	users: Pick<DbUser, 'full_name' | 'email'> | null
}

/** Order row + the rider's profile (for vendor tracking view) */
export interface OrderWithRider extends DbOrder {
	riders: RiderWithUser | null
}

/** Full user profile including their role-specific sub-profile */
export interface UserProfile extends DbUser {
	vendor: DbVendor | null
	rider: DbRider | null
}

// ─── Send-package wizard draft ───────────────────────────────────────────────
// Stored in sessionStorage as nd_order_draft between steps 1-3.

export interface OrderDraft {
	pickup: LocationPoint | null
	dropoff: LocationPoint | null
	distance_m: number | null
	duration_s: number | null
	size: string | null
	vehicle: string | null
	description: string | null
	voice_note: string | null
	recipient_name: string | null
	recipient_phone: string | null
	notify_receiver: boolean
	estimated_price: number | null
	/** Set once the order row is created in step 3 */
	orderId: string | null
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

export interface ScoredRider extends DbRider {
	distance: number
	score: number
}

// ─── Map ─────────────────────────────────────────────────────────────────────

export interface MapMarker {
	lat: number
	lng: number
	/** Determines pin colour */
	color: 'emerald' | 'white' | 'amber' | 'red'
	type: 'pickup' | 'dropoff' | 'rider'
}

// ─── API responses ───────────────────────────────────────────────────────────

export interface ApiSuccess<T = void> {
	success: true
	data?: T
}

export interface ApiError {
	success: false
	error: string
}

export type ApiResult<T = void> = ApiSuccess<T> | ApiError
