import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ensureUserProfile, getRoleRedirectPath } from '@/services/auth.service'

export default async function ResolvePage() {
	try {
		const supabase = await createClient()
    
		const {
			data: { user }
		} = await supabase.auth.getUser()
		if (!user) redirect('/auth/login')

		await ensureUserProfile(supabase, user.id, {
			role: user.user_metadata?.role || 'vendor',
			name:
				user.user_metadata?.full_name ||
				user.email?.split('@')[0] ||
				null
		})

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
	} catch {
		redirect('/auth/login')
	}
}
