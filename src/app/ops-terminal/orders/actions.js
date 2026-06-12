'use server'

import { validateAdmin, logAdminAction } from '@/utils/admin'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function forceCancelOrder(orderId, reason = 'Ops Override') {
	try {
		const { admin } = await validateAdmin()
		const supabase = await createClient()

		const { error: orderError } = await supabase
			.from('orders')
			.update({
				status: 'cancelled',
				payment_status: 'voided',
				rider_id: null,
				rider_user_id: null
			})
			.eq('id', orderId)

		if (orderError) throw orderError

		await logAdminAction(admin.id, 'FORCE_CANCEL_ORDER', 'order', orderId, {
			reason
		})

		revalidatePath('/ops-terminal/orders')
		return { success: true }
	} catch (err) {
		console.error('Ops Override Error:', err)
		return { success: false, error: err.message }
	}
}
