import { createAdminClient } from '@/utils/supabase/admin'
import { validateAdmin } from '@/utils/admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
	try {
		const { driverId } = await request.json()

		const { user } = await validateAdmin()

		const adminSupabase = createAdminClient()

		const { error } = await adminSupabase
			.from('riders')
			.update({ status: 'approved', approved: true })
			.eq('user_id', driverId)

		if (error) throw error

		await adminSupabase.from('admin_action_logs').insert({
			admin_id: user.id,
			action: 'approve',
			target_type: 'rider',
			target_id: driverId,
			details: { status: 'approved', approved: true }
		})

		return NextResponse.json({ success: true })
	} catch (err) {
		return NextResponse.json({ error: err.message }, { status: 400 })
	}
}
