import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getUserPortals } from '@/services/auth.service'

export default async function DashboardLayout({ children }) {
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

	const portals = await getUserPortals(supabase)
	if (portals?.rider) redirect('/rider')

	return <>{children}</>
}
