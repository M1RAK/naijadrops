import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaystackVerifyResponse {
	status: boolean
	message: string
	data: {
		status: string
		amount: number
		currency: string
		reference: string
		metadata: {
			orderId: string
			riderId?: string
			vendorId?: string
		}
	}
}

export interface VerifyPaymentResult {
	success: boolean
	error?: string
	alreadyProcessed?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verify a Paystack transaction reference against the Paystack API.
 * Returns the raw Paystack response.
 *
 * Throws on network failure.
 */
export async function verifyPaystackTransaction(
	reference: string
): Promise<PaystackVerifyResponse> {
	const secretKey = process.env.PAYSTACK_SECRET_KEY

	if (!secretKey || secretKey.includes('dummy')) {
		// Dev mode — return a simulated success response
		console.warn(
			'[payments] No PAYSTACK_SECRET_KEY set — using simulated response'
		)
		return {
			status: true,
			message: 'Verification successful (simulated)',
			data: {
				status: 'success',
				amount: 999999, // large number so amount check passes in dev
				currency: 'NGN',
				reference,
				metadata: { orderId: '' }
			}
		}
	}

	const res = await fetch(
		`https://api.paystack.co/transaction/verify/${reference}`,
		{
			method: 'GET',
			headers: { Authorization: `Bearer ${secretKey}` }
		}
	)

	if (!res.ok) {
		throw new Error(`Paystack API returned ${res.status}`)
	}

	return res.json() as Promise<PaystackVerifyResponse>
}

/**
 * Verify a payment and update the order status if valid.
 *
 * Checks:
 * 1. Paystack says the transaction succeeded
 * 2. The amount paid matches the order's agreed price
 * 3. The order hasn't already been processed
 *
 * On success, updates the order to status=accepted and generates a delivery PIN.
 */
export async function verifyAndFinalisePayment(
	supabase: SupabaseClient,
	reference: string,
	orderId: string
): Promise<VerifyPaymentResult> {
	// 1. Verify with Paystack
	let paystackData: PaystackVerifyResponse
	try {
		paystackData = await verifyPaystackTransaction(reference)
	} catch (err) {
		return { success: false, error: 'Could not reach Paystack API.' }
	}

	if (!paystackData.status || paystackData.data.status !== 'success') {
		return {
			success: false,
			error: `Transaction status: ${paystackData.data.status}`
		}
	}

	// 2. Fetch the order to check the agreed price
	const { data: order, error: orderError } = await supabase
		.from('orders')
		.select('agreed_price, status')
		.eq('id', orderId)
		.single()

	if (orderError || !order) {
		return { success: false, error: 'Order not found.' }
	}

	// 3. Check it hasn't already been processed
	if (order.status === 'accepted') {
		return { success: true, alreadyProcessed: true }
	}

	// 4. Amount check — Paystack returns kobo, we store naira
	const expectedKobo = order.agreed_price * 100
	if (paystackData.data.amount < expectedKobo) {
		return {
			success: false,
			error: `Underpayment: expected ₦${order.agreed_price}, received ₦${
				paystackData.data.amount / 100
			}`
		}
	}

	// 5. Generate a 4-digit delivery PIN and mark the order as accepted
	const deliveryPin = String(Math.floor(1000 + Math.random() * 9000))

	const { error: updateError } = await supabase
		.from('orders')
		.update({ status: 'accepted', delivery_pin: deliveryPin })
		.eq('id', orderId)

	if (updateError) {
		return {
			success: false,
			error: `DB update failed: ${updateError.message}`
		}
	}

	return { success: true }
}

/**
 * Verify a Paystack webhook signature.
 * The signature is an HMAC-SHA512 hash of the raw request body
 * using the Paystack secret key.
 *
 * Returns true if the signature is valid.
 */
export async function verifyWebhookSignature(
	rawBody: string,
	signature: string
): Promise<boolean> {
	const secretKey = process.env.PAYSTACK_SECRET_KEY
	if (!secretKey) return false

	// Use the Web Crypto API (available in Next.js Edge and Node runtimes)
	const encoder = new TextEncoder()
	const keyData = encoder.encode(secretKey)
	const messageData = encoder.encode(rawBody)

	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		keyData,
		{ name: 'HMAC', hash: 'SHA-512' },
		false,
		['sign']
	)

	const signatureBuffer = await crypto.subtle.sign(
		'HMAC',
		cryptoKey,
		messageData
	)
	const computedHash = Array.from(new Uint8Array(signatureBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')

	return computedHash === signature
}
