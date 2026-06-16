import { NextResponse } from 'next/server'
import { validateAdmin } from '@/utils/admin'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request) {
	try {
		await validateAdmin()

		const { orderId } = await request.json()
		if (!orderId) {
			return NextResponse.json(
				{ error: 'orderId is required.' },
				{ status: 400 }
			)
		}

		const adminSupabase = createAdminClient()

		const { data: order, error: orderError } = await adminSupabase
			.from('orders')
			.select('*')
			.eq('id', orderId)
			.single()

		if (orderError || !order) {
			return NextResponse.json(
				{ error: 'Order not found.' },
				{ status: 404 }
			)
		}

		// Pull rider + vendor rows directly (no embedded join — avoids
		// PostgREST schema-cache / FK-relationship fragility)
		const [riderResult, vendorResult] = await Promise.all([
			order.rider_id
				? adminSupabase
						.from('riders')
						.select(
							'user_id, current_lat, current_lng, vehicle_type, plate_number'
						)
						.eq('id', order.rider_id)
						.single()
				: Promise.resolve({ data: null }),
			adminSupabase
				.from('vendors')
				.select('user_id, business_name')
				.eq('id', order.vendor_id)
				.single()
		])

		const userIds = [
			riderResult.data?.user_id,
			vendorResult.data?.user_id
		].filter(Boolean)

		const usersById = new Map()
		if (userIds.length > 0) {
			const { data: users } = await adminSupabase
				.from('users')
				.select('id, name, phone')
				.in('id', userIds)
			for (const u of users ?? []) {
				usersById.set(u.id, { name: u.name, phone: u.phone })
			}
		}

		const riders = riderResult.data
			? {
					...riderResult.data,
					users: usersById.get(riderResult.data.user_id) ?? null
			  }
			: null

		const vendors = vendorResult.data
			? {
					...vendorResult.data,
					users: usersById.get(vendorResult.data.user_id) ?? null
			  }
			: null

		return NextResponse.json({ ...order, riders, vendors })
	} catch (err) {
		console.error('[admin/order-detail] error:', err)
		return NextResponse.json(
			{ error: 'Internal server error.' },
			{ status: 500 }
		)
	}
}
