import type { OrderStatus } from './database.types'

// ─── Generic response wrapper ─────────────────────────────────────────────────
// Every API route should return one of these two shapes.

export interface ApiSuccess<T = void> {
	success: true
	data?: T
}

export interface ApiError {
	success: false
	error: string
}

export type ApiResult<T = void> = ApiSuccess<T> | ApiError

// ─── /api/dispatch ────────────────────────────────────────────────────────────

export interface DispatchRequest {
	orderId: string
}

export interface DispatchSuccess {
	success: true
	riderId: string
	message: string
}

export interface DispatchFailure {
	success: false
	message: string
}

export type DispatchResult = DispatchSuccess | DispatchFailure

// ─── /api/resolve-link ────────────────────────────────────────────────────────

export interface ResolveLinkRequest {
	url: string
}

export interface ResolveLinkSuccess {
	lat: number
	lng: number
	cached?: boolean
	full_url?: string
}

export interface ResolveLinkError {
	error:
		| 'MISSING_URL'
		| 'UNSUPPORTED_DOMAIN'
		| 'NO_COORDINATES_FOUND'
		| 'SERVER_ERROR'
}

export type ResolveLinkResult = ResolveLinkSuccess | ResolveLinkError

// ─── /api/verify-payment ──────────────────────────────────────────────────────

export interface VerifyPaymentRequest {
	reference: string
	orderId: string
}

// ─── /api/notify-delivery ────────────────────────────────────────────────────

export interface NotifyDeliveryRequest {
	orderId: string
	trackingUrl: string
	recipientPhone: string
}

// ─── /api/admin/approve-driver ───────────────────────────────────────────────

export interface ApproveDriverRequest {
	driverId: string
}

// ─── /api/admin/invite-driver ────────────────────────────────────────────────

export interface InviteDriverRequest {
	fullName: string
	email: string
	phone?: string
}

export interface InviteDriverSuccess {
	success: true
	userId: string
	inviteLink: string | null
	warning?: string
}

// ─── /api/admin/delete-user ──────────────────────────────────────────────────

export interface DeleteUserRequest {
	userId: string
}

// ─── Webhook payload from Paystack ───────────────────────────────────────────

export interface PaystackWebhookPayload {
	event: 'charge.success' | string
	data: {
		reference: string
		amount: number
		currency: string
		status: string
		metadata: {
			orderId: string
			riderId?: string
			vendorId?: string
		}
	}
}
