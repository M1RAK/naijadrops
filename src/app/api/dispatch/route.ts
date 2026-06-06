import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { dispatchOrder } from '@/services/dispatch.service'
import type { DbOrder } from '@/types/database.types'
import type { DispatchResult } from '@/types/api.types'
import type { SupabaseClient } from '@supabase/supabase-js'

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

		const supabaseOrMock = await createClient()

		// Guard: during build, createClient() returns a mock object that doesn't
		// satisfy SupabaseClient. Bail out early so TypeScript is satisfied and
		// the build doesn't fail.
		if (!('supabaseUrl' in supabaseOrMock)) {
			return NextResponse.json(
				{ success: false, message: 'Service unavailable.' },
				{ status: 503 }
			)
		}

		const supabase = supabaseOrMock as SupabaseClient

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
			// 200 not 404 — "no driver found" is an expected outcome, not an error
			return NextResponse.json(result, { status: 200 })
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
