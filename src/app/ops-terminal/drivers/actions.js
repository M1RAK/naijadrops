'use server'

import { validateAdmin, logAdminAction } from '@/utils/admin'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import {
	approveRider as approveRiderService,
	deactivateRider as deactivateRiderService
} from '@/services/riders.service'

export async function approveRider(riderId) {
	try {
		const { admin } = await validateAdmin()
		const supabase = await createClient()

		await approveRiderService(supabase, riderId)

		await logAdminAction(admin.id, 'RIDER_APPROVAL', 'rider', riderId, {
			status: 'approved'
		})

		revalidatePath('/ops-terminal/drivers')
		return { success: true }
	} catch (err) {
		console.error('Admin Action Error:', err)
		return { success: false, error: err.message }
	}
}

export async function deactivateRider(riderId) {
	try {
		const { admin } = await validateAdmin()
		const supabase = await createClient()

		await deactivateRiderService(supabase, riderId)

		await logAdminAction(admin.id, 'RIDER_DEACTIVATION', 'rider', riderId, {
			status: 'paused'
		})

		revalidatePath('/ops-terminal/drivers')
		return { success: true }
	} catch (err) {
		console.error('Admin Action Error:', err)
		return { success: false, error: err.message }
	}
}

export async function inviteRider(formData) {
	try {
		const { admin } = await validateAdmin()
		const { createAdminClient } = await import('@/utils/supabase/admin')
		const adminSupabase = createAdminClient()

		const email = formData.get('email')
		const fullName = formData.get('full_name')
		const vehicleType = formData.get('vehicle_type')

		if (!email || !fullName)
			throw new Error('Email and Full Name are required')

		const { data: inviteData, error: inviteError } =
			await adminSupabase.auth.admin.inviteUserByEmail(email, {
				data: {
					full_name: fullName,
					role: 'rider',
					vehicle_type: vehicleType || 'bike'
				}
			})

		if (inviteError) throw inviteError

		await logAdminAction(
			admin.id,
			'RIDER_INVITE',
			'rider',
			inviteData.user.id,
			{ email, fullName }
		)

		revalidatePath('/ops-terminal/drivers')
		return { success: true }
	} catch (err) {
		console.error('Admin Invite Error:', err)
		return { success: false, error: err.message }
	}
}
