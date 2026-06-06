import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

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

	const { data: profile } = await supabase
		.from('users')
		.select('role')
		.eq('id', user.id)
		.single()

	if (profile?.role === 'rider') redirect('/rider')
	if (profile?.role === 'admin') redirect('/ops-terminal/dashboard')

	return <>{children}</>
}
