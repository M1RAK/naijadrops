// ─── Enums ──────────────────────────────────────────────────────────────────

export type VehicleType = 'bike' | 'car' | 'van'
export type RiderStatus = 'pending' | 'approved' | 'rejected' | 'paused'
export type OperationalStatus = 'online' | 'offline' | 'awaiting_payment'

export type OrderStatus =
	| 'pending'
	| 'matched'
	| 'assigned'
	| 'picked_up'
	| 'in_transit'
	| 'delivered'
	| 'cancelled'

export type PaymentStatus = 'unpaid' | 'authorized' | 'voided' | 'released'

// ─── Table row shapes ────────────────────────────────────────────────────────
// These match the Supabase schema exactly.
// Rule: never add computed/joined fields here — use domain.types.ts for those.

export interface DbUser {
	id: string
	// NOTE: role column was removed. Capabilities are derived from
	// which profile rows exist (vendors / riders / admin_users) —
	// see auth.service.ts getUserPortals().
	name: string | null
	avatar_url: string | null
	created_at: string
}

export interface DbVendor {
	id: string
	user_id: string
	business_name: string | null
	created_at: string
}

export interface DbRider {
	id: string
	user_id: string
	status: RiderStatus
	approved: boolean
	vehicle_type: VehicleType
	plate_number: string | null
	rating: number
	current_lat: number | null
	current_lng: number | null
	last_seen_at: string | null
	operational_status: OperationalStatus
	acceptance_rate: number
	orders_completed_today: number
	profile_photo_url: string | null
	id_card_url: string | null
	license_url: string | null
	vehicle_photo_url: string | null
	phone: string | null
	full_name: string | null
	rejection_reason: string | null
	documents_submitted_at: string | null
	created_at: string
}

export interface DbOrder {
	id: string
	vendor_id: string
	rider_id: string | null // → riders.id
	rider_user_id: string | null // → users.id (denormalised, synced by trigger)
	status: OrderStatus
	payment_status: PaymentStatus
	pickup_name: string
	pickup_lat: number
	pickup_lng: number
	dropoff_name: string
	dropoff_lat: number
	dropoff_lng: number
	item_size: string | null
	item_category: string | null
	item_description: string | null
	vehicle_type: VehicleType
	recipient_name: string | null
	recipient_phone: string | null
	notify_receiver: boolean
	agreed_price: number
	delivery_pin: string | null
	pickup_details: string | null
	dropoff_details: string | null
	scheduled_at: string | null
	delivery_photo_url: string | null
	locked: boolean
	created_at: string
	updated_at: string
}

export interface DbAdminUser {
	id: string
	email: string
	role: string
	is_active: boolean
	is_super_admin: boolean
	full_name: string | null
	created_at: string
}

export interface DbReview {
	id: string
	order_id: string
	rider_id: string
	user_id: string
	rating: number
	feedback: string | null
	created_at: string
}

export interface DbAdminActionLog {
	id: string
	admin_id: string
	action: string
	target_type: string
	target_id: string | null
	details: Record<string, unknown>
	created_at: string
}

export interface DbResolvedLink {
	id: string
	original_url: string
	lat: number
	lng: number
	created_at: string
}

export interface DbWalletTransaction {
	id: string
	rider_id: string
	amount: number
	type: 'earning' | 'payout_request' | 'payout_completed'
	order_id: string | null
	created_at: string
}
