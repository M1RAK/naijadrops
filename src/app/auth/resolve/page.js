import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ensureUserProfile, getPortalPath, getUserPortals } from '@/services/auth.service'

export default async function ResolvePage() {
	try {
		const supabase = await createClient()

		const {
			data: { user }
		} = await supabase.auth.getUser()

		if (!user) redirect('/auth/login')

		await ensureUserProfile(supabase, user.id, {
			name: user.user_metadata?.full_name || user.email?.split('@')[0] || null
		})

		const portals = await getUserPortals(supabase)
		if (!portals) redirect('/auth/login')

		redirect(getPortalPath(portals))
	} catch {
		redirect('/auth/login')
	}
}
