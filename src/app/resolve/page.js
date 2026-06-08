import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getRoleRedirectPath } from '@/services/auth.service'

export default async function ResolvePage() {
	let supabase
	try {
		supabase = await createClient()
	} catch {
		redirect('/auth/login')
	}

	const {
		data: { user }
	} = await supabase.auth.getUser()
	if (!user) redirect('/auth/login')

	const { data: profile } = await supabase
		.from('users')
		.select('role')
		.eq('id', user.id)
		.single()

	if (profile?.role) {
		redirect(getRoleRedirectPath(profile.role))
	} else {
		await supabase
			.from('users')
			.update({ role: 'vendor' })
			.eq('id', user.id)
		redirect('/dashboard')
	}
}
