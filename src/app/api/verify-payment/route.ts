import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAndFinalisePayment } from '@/services/payments.service'

function getAdminClient() {
	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_ROLE_KEY,
		{ auth: { autoRefreshToken: false, persistSession: false } }
	)
}

export async function POST(req: Request): Promise<NextResponse> {
	try {
		const { reference, orderId } = await req.json()

		if (!reference || !orderId) {
			return NextResponse.json(
				{ error: 'Missing reference or orderId.' },
				{ status: 400 }
			)
		}

		const supabase = getAdminClient()
		const result = await verifyAndFinalisePayment(
			supabase,
			reference,
			orderId
		)

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 })
		}

		return NextResponse.json({ success: true })
	} catch (err) {
		console.error('[verify-payment] Unhandled error:', err)
		return NextResponse.json(
			{ error: 'Internal server error.' },
			{ status: 500 }
		)
	}
}

