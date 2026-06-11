import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function HistoryOrderHeadless() {
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

	const { data: rider } = await supabase
		.from('riders')
		.select('id')
		.eq('user_id', user.id)
		.single()

	if (rider) redirect('/rider/earnings')
	redirect('/vendor/history')
}
