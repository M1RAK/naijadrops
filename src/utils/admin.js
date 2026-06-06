import { createClient } from '@/utils/supabase/server'

/**
 * Layer 2: Server-Side Admin Validation
 * Reads super_admin status from the database — no hardcoded emails.
 */
export async function validateAdmin(requiredRole = 'admin') {
	let supabase
	try {
		supabase = await createClient()
	} catch {
		throw new Error('Unauthorized Access - Service unavailable')
	}

	const {
		data: { user },
		error: authError
	} = await supabase.auth.getUser()
	if (authError || !user)
		throw new Error('Unauthorized Access - Authentication Required')

	if (!user.email?.toLowerCase().endsWith('@naijadrops.tech')) {
		throw new Error('Unauthorized Access - Corporate Domain Required')
	}

	const { data: admin, error: dbError } = await supabase
		.from('admin_users')
		.select('*')
		.eq('id', user.id)
		.single()

	if (dbError || !admin || !admin.is_active) {
		throw new Error(
			'Unauthorized Access - High Security Clearance Required'
		)
	}

	if (requiredRole === 'super_admin' && !admin.is_super_admin) {
		throw new Error('Forbidden - Super Admin Access Only')
	}

	return { user, admin }
}

/**
 * Layer 4: Immutable Audit Logging
 */
export async function logAdminAction(
	adminId,
	action,
	targetType,
	targetId,
	details = {}
) {
	let supabase
	try {
		supabase = await createClient()
	} catch {
		console.error(
			'logAdminAction: Supabase unavailable, skipping audit log'
		)
		return
	}
	await supabase.from('admin_action_logs').insert({
		admin_id: adminId,
		action,
		target_type: targetType,
		target_id: targetId,
		details
	})
}
