import type { SupabaseClient } from '@supabase/supabase-js'
import type { DbOrder, OrderStatus } from '@/types/database.types'
import type { OrderWithRider } from '@/types/domain.types'
import { ACTIVE_ORDER_STATUSES } from '@/utils/constants'

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch a single order by ID.
 * Returns null if not found rather than throwing.
 */
export async function getOrderById(
	supabase: SupabaseClient,
	orderId: string
): Promise<OrderWithRider | null> {
	const { data, error } = await supabase
		.from('orders')
		.select('*, riders(*, users(name, email))')
		.eq('id', orderId)
		.single()

	if (error || !data) return null
	return data as OrderWithRider
}

/**
 * Fetch all orders for a vendor.
 * NOTE: vendorId is vendors.id — NOT the auth user id.
 */
export async function getVendorOrders(
	supabase: SupabaseClient,
	vendorId: string
): Promise<DbOrder[]> {
	const { data, error } = await supabase
		.from('orders')
		.select('*')
		.eq('vendor_id', vendorId)
		.order('created_at', { ascending: false })

	if (error || !data) return []
	return data as DbOrder[]
}

/**
 * Fetch the current active order for a vendor, if any.
 * Returns null if the vendor has no active orders.
 * NOTE: vendorId is vendors.id — NOT the auth user id.
 */
export async function getActiveVendorOrder(
	supabase: SupabaseClient,
	vendorId: string
): Promise<Pick<DbOrder, 'id' | 'status'> | null> {
	const { data } = await supabase
		.from('orders')
		.select('id, status')
		.eq('vendor_id', vendorId)
		.in('status', ACTIVE_ORDER_STATUSES)
		.order('created_at', { ascending: false })
		.limit(1)
		.single()

	return data ?? null
}

/**
 * Fetch orders assigned to a rider that are currently active.
 * NOTE: riderId here is the rider profile id (riders.id).
 */
export async function getActiveRiderOrder(
	supabase: SupabaseClient,
	riderId: string
): Promise<OrderWithRider | null> {
	const RIDER_ACTIVE_STATUSES: OrderStatus[] = [
		'assigned',
		'picked_up',
		'in_transit'
	]

	const { data, error } = await supabase
		.from('orders')
		.select('*, riders(*)')
		.eq('rider_id', riderId)
		.in('status', RIDER_ACTIVE_STATUSES)
		.order('updated_at', { ascending: false })
		.limit(1)
		.single()

	if (error || !data) return null
	return data as OrderWithRider
}

/**
 * Fetch completed orders for a rider, used on the earnings page.
 * NOTE: riderId here is the rider profile id (riders.id).
 */
export async function getRiderCompletedOrders(
	supabase: SupabaseClient,
	riderId: string
): Promise<DbOrder[]> {
	const { data, error } = await supabase
		.from('orders')
		.select('*')
		.eq('rider_id', riderId)
		.eq('status', 'delivered')
		.order('created_at', { ascending: false })

	if (error || !data) return []
	return data as DbOrder[]
}

/**
 * Fetch available jobs for a rider — pending orders with no rider assigned.
 */
export async function getAvailableOrders(
	supabase: SupabaseClient,
	limit = 10
): Promise<DbOrder[]> {
	const { data, error } = await supabase
		.from('orders')
		.select('*')
		.eq('status', 'pending')
		.is('rider_id', null)
		.limit(limit)

	if (error || !data) return []
	return data as DbOrder[]
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a new order.
 * Throws on error so the caller can handle it.
 */
export async function createOrder(
	supabase: SupabaseClient,
	orderData: Omit<DbOrder, 'id' | 'created_at' | 'updated_at'>
): Promise<DbOrder> {
	const { data, error } = await supabase
		.from('orders')
		.insert(orderData)
		.select()
		.single()

	if (error) throw new Error(`Failed to create order: ${error.message}`)
	return data as DbOrder
}

/**
 * Update the status of an order.
 * Used by the rider's active-job screen to progress through the delivery flow.
 */
export async function updateOrderStatus(
	supabase: SupabaseClient,
	orderId: string,
	status: OrderStatus,
	extraFields: Partial<DbOrder> = {}
): Promise<void> {
	const { error } = await supabase
		.from('orders')
		.update({ status, ...extraFields })
		.eq('id', orderId)

	if (error)
		throw new Error(`Failed to update order status: ${error.message}`)
}

/**
 * Assign a rider to an order and lock it to prevent race conditions.
 */
export async function assignRiderToOrder(
	supabase: SupabaseClient,
	orderId: string,
	riderId: string,
	riderUserId?: string
): Promise<void> {
	const update: Partial<DbOrder> & { rider_user_id?: string | null } = {
		rider_id: riderId,
		status: 'matched',
		locked: true
	}

	if (riderUserId) {
		update.rider_user_id = riderUserId
	}

	const { error } = await supabase
		.from('orders')
		.update(update)
		.eq('id', orderId)

	if (error) throw new Error(`Failed to assign rider: ${error.message}`)
}

/**
 * Release a rider from an order — used when a vendor cancels a match
 * or when force-cancelling from the ops terminal.
 */
export async function releaseRiderFromOrder(
	supabase: SupabaseClient,
	orderId: string
): Promise<void> {
	const { error } = await supabase
		.from('orders')
		.update({
			rider_id: null,
			rider_user_id: null,
			status: 'pending',
			locked: false
		})
		.eq('id', orderId)

	if (error) throw new Error(`Failed to release rider: ${error.message}`)
}

/**
 * Cancel an order. Used by both vendors and the ops terminal.
 * The ops terminal version also voids payment — pass paymentStatus accordingly.
 */
export async function cancelOrder(
	supabase: SupabaseClient,
	orderId: string,
	opts: { voidPayment?: boolean } = {}
): Promise<void> {
	const update: Partial<DbOrder> = {
		status: 'cancelled',
		rider_id: null
	}

	if (opts.voidPayment) {
		update.payment_status = 'voided'
	}

	const { error } = await supabase
		.from('orders')
		.update(update)
		.eq('id', orderId)

	if (error) throw new Error(`Failed to cancel order: ${error.message}`)
}
