import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getUserRole, getRoleRedirectPath } from '@/utils/auth'

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

	const { role } = await getUserRole(supabase)

	if (role) {
		redirect(getRoleRedirectPath(role))
	} else {
		await supabase
			.from('users')
			.update({ role: 'vendor' })
			.eq('id', user.id)
		redirect('/dashboard')
	}
}
