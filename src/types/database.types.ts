// ─── Enums ──────────────────────────────────────────────────────────────────

export type UserRole = 'vendor' | 'rider' | 'admin'
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
// These match your Supabase columns exactly.
// Rule: never add computed/joined fields here — use domain.types.ts for those.

export interface DbUser {
	id: string
	role: UserRole
	// NOTE: codebase uses both 'name' and 'full_name' in different places.
	// 'name' is the actual column in the users table.
	// 'full_name' comes from user_metadata on the auth.users object.
	// Using both here until the column naming is resolved.
	name: string | null
	full_name: string | null
	avatar_url: string | null
	active_mode: string | null
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
	// NOTE: full_name here is a denormalised copy stored directly on the riders
	// row (set during onboarding). Separate from users.name.
	full_name: string | null
	rejection_reason: string | null
	// Set when the rider submits their onboarding documents
	documents_submitted_at: string | null
	created_at: string
}

export interface DbOrder {
	id: string
	vendor_id: string
	rider_id: string | null
	status: OrderStatus
	payment_status: PaymentStatus
	negotiation_status: string | null
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
	voice_note_url: string | null
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

export interface DbMessage {
	id: string
	order_id: string
	sender_id: string
	text: string
	type: 'text' | 'system'
	created_at: string
}

export interface DbBid {
	id: string
	order_id: string
	rider_id: string
	amount: number
	status: 'pending' | 'accepted' | 'rejected'
	created_at: string
}

export interface DbReview {
	id: string
	order_id: string
	driver_id: string
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

export interface DbRiderLocation {
	id: string
	rider_id: string
	lat: number
	lng: number
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
