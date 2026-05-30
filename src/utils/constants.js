/**
 * NaijaDrops — Shared Constants
 *
 * Single source of truth for magic strings used across the app.
 * Previously this file had ORDER_STATUS values that didn't match
 * the actual DB values — fixed below.
 */

// ─── Order Statuses ──────────────────────────────────────────────────────────
// These match the actual values stored in the orders.status column.

export const ORDER_STATUS = {
	PENDING: 'pending',
	MATCHED: 'matched',
	ASSIGNED: 'assigned',
	PICKED_UP: 'picked_up',
	IN_TRANSIT: 'in_transit',
	DELIVERED: 'delivered',
	CANCELLED: 'cancelled'
}

// Statuses that mean an order is still active (not yet done)
export const ACTIVE_ORDER_STATUSES = [
	ORDER_STATUS.PENDING,
	ORDER_STATUS.MATCHED,
	ORDER_STATUS.ASSIGNED,
	ORDER_STATUS.PICKED_UP,
	ORDER_STATUS.IN_TRANSIT
]

// The status the rider progresses to from the current one
export const ORDER_STATUS_TRANSITIONS = {
	[ORDER_STATUS.ASSIGNED]: ORDER_STATUS.PICKED_UP,
	[ORDER_STATUS.PICKED_UP]: ORDER_STATUS.IN_TRANSIT,
	[ORDER_STATUS.IN_TRANSIT]: ORDER_STATUS.DELIVERED
}

/**
 * Returns the next status in the delivery flow, or null if there is none.
 * Used by the rider's active-job screen to determine what the next
 * SlideToConfirm action should do.
 */
export function getNextOrderStatus(currentStatus) {
	return ORDER_STATUS_TRANSITIONS[currentStatus] ?? null
}

// ─── User Roles ───────────────────────────────────────────────────────────────

export const USER_ROLES = {
	RIDER: 'rider',
	VENDOR: 'vendor',
	ADMIN: 'admin'
}

// ─── Rider Statuses ───────────────────────────────────────────────────────────

export const RIDER_STATUS = {
	PENDING: 'pending',
	APPROVED: 'approved',
	REJECTED: 'rejected',
	PAUSED: 'paused'
}

// ─── Vehicle Types ────────────────────────────────────────────────────────────

export const VEHICLE_TYPES = {
	BIKE: 'bike',
	CAR: 'car',
	VAN: 'van'
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export const PRICING = {
	BASE_FARE: 500,
	PER_KM: {
		bike: 120,
		car: 200,
		van: 350
	},
	SIZE_MULTIPLIERS: {
		small: 1.0,
		medium: 1.25,
		large: 1.6
	},
	EXPRESS_MULTIPLIER: 1.3,
	// Platform takes this percentage of each completed order
	PLATFORM_COMMISSION: 0.15
}

/**
 * Calculate delivery price from distance, vehicle type, and package size.
 * Rounds to the nearest ₦50.
 */
export function calculatePrice(distanceM, vehicleType, size) {
	const km = distanceM / 1000
	const rate = PRICING.PER_KM[vehicleType] ?? PRICING.PER_KM.bike
	const multiplier = PRICING.SIZE_MULTIPLIERS[size] ?? 1.0
	const raw = (PRICING.BASE_FARE + km * rate) * multiplier
	return Math.round(raw / 50) * 50
}

// ─── Geography ────────────────────────────────────────────────────────────────

export const KANO_CENTER = { lat: 12.0022, lng: 8.5167 }

export const KANO_BOUNDS = {
	minLat: 11.89,
	maxLat: 12.15,
	minLng: 8.4,
	maxLng: 8.65
}

// ─── App Config ───────────────────────────────────────────────────────────────

export const APP_CONFIG = {
	DEFAULT_MAP_ZOOM: 13,
	RIDER_ACTIVE_WINDOW_MS: 3 * 60 * 1000, // 3 minutes
	HEARTBEAT_INTERVAL_MS: 35 * 1000, // 35 seconds
	NEGOTIATION_TIMEOUT_S: 60 // 60 seconds
}
