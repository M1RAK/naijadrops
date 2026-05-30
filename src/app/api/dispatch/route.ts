import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { dispatchOrder } from '@/services/dispatch.service'
import type { DbOrder } from '@/types/database.types'
import type { DispatchResult } from '@/types/api.types'

export async function POST(
	req: Request
): Promise<NextResponse<DispatchResult>> {
	try {
		const { orderId } = await req.json()

		if (!orderId) {
			return NextResponse.json(
				{ success: false, message: 'orderId is required.' },
				{ status: 400 }
			)
		}

		const supabase = await createClient()

		// Fetch the order
		const { data: order, error: orderError } = await supabase
			.from('orders')
			.select('*')
			.eq('id', orderId)
			.single()

		if (orderError || !order) {
			return NextResponse.json(
				{ success: false, message: 'Order not found.' },
				{ status: 404 }
			)
		}

		// Run the dispatch engine
		const result = await dispatchOrder(supabase, order as DbOrder)

		if (!result.success) {
			return NextResponse.json(result, { status: 200 })
			// Note: 200 not 404 — "no driver found" is an expected outcome, not an error
		}

		return NextResponse.json({
			success: true,
			riderId: result.riderId,
			message: 'Rider matched.'
		})
	} catch (err) {
		console.error('[dispatch] Unhandled error:', err)
		return NextResponse.json(
			{ success: false, message: 'Internal server error.' },
			{ status: 500 }
		)
	}
}
