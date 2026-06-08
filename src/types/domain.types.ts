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
	users: (Pick<DbUser, 'full_name'> & { email: string | null }) | null
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

// ─── Dispatch ────────────────────────────────────────────────────────────────

export interface ScoredRider extends DbRider {
	distance: number
	score: number
}
