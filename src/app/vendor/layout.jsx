import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function VendorLayout({ children }) {
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

	return (
		<div className='min-h-screen bg-charcoal-950 text-white'>
			<main className='flex-1 p-6 max-w-7xl mx-auto w-full'>
				{children}
			</main>
		</div>
	)
}
