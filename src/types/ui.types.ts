import type { OrderStatus, VehicleType } from './database.types'
import type { LocationPoint } from './domain.types'

// ─── Order draft (sessionStorage between wizard steps) ───────────────────────

export interface OrderDraft {
	pickup: LocationPoint | null
	dropoff: LocationPoint | null
	distance_m: number | null
	duration_s: number | null
	size: 'small' | 'medium' | 'large' | null
	vehicle: VehicleType | null
	description: string | null
	recipient_name: string | null
	recipient_phone: string | null
	notify_receiver: boolean
	estimated_price: number | null
	// Set once the order row is created in step 3
	orderId: string | null
}

// ─── Map component props ──────────────────────────────────────────────────────

export interface MapMarker {
	lat: number
	lng: number
	color: 'emerald' | 'white' | 'amber' | 'red'
	type: 'pickup' | 'dropoff' | 'rider'
}

export interface RouteInfo {
	distance: number // metres
	duration: number // seconds
}

// ─── Status display ───────────────────────────────────────────────────────────

export interface StatusConfig {
	label: string
	color: string // tailwind text class
	bg: string // tailwind bg + border classes
}

export type OrderStatusConfig = Record<OrderStatus, StatusConfig>

// ─── Form state helpers ───────────────────────────────────────────────────────

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface FormField<T = string> {
	value: T
	error: string | null
}

// ─── Auth gate ────────────────────────────────────────────────────────────────

export type AuthMode = 'login' | 'signup' | 'reset'

// ─── Rider onboarding ────────────────────────────────────────────────────────

export type OnboardingStep = 1 | 2 | 3

export type DocumentUploadStatus = 'idle' | 'uploading' | 'done' | 'error'

export interface DocumentUploadState {
	id_card: DocumentUploadStatus
	license: DocumentUploadStatus
	vehicle_photo: DocumentUploadStatus
	profile_photo: DocumentUploadStatus
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export interface PriceBreakdown {
	base: number
	distanceCost: number
	sizeMultiplier: number
	total: number
	express: number // total * EXPRESS_MULTIPLIER
}
