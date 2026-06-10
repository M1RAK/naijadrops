'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2 } from 'lucide-react'
import {
	ensureUserProfile,
	getRoleRedirectPath
} from '@/services/auth.service'
import { ensureVendorProfile } from '@/services/vendors.service'

/**
 * Headless Role Selection
 * This page resolves the user's role from their session or metadata and
 * sends them to the matching portal.
 */
export default function RoleSelectRedirect() {
	const router = useRouter()
	const supabase = createClient()

	useEffect(() => {
		async function resolveAndRedirect() {
			const {
				data: { user }
			} = await supabase.auth.getUser()

			if (!user) {
				router.replace('/auth/login')
				return
			}

			const { data: profile } = await supabase
				.from('users')
				.select('role')
				.eq('id', user.id)
				.single()

			if (!profile?.role) {
				const intendedRole =
					sessionStorage.getItem('nd_intended_role') || 'vendor'

				await ensureUserProfile(supabase, user.id, {
					role: intendedRole,
					name:
						user.user_metadata?.full_name ||
						user.email?.split('@')[0] ||
						null
				})

				if (intendedRole === 'vendor') {
					await ensureVendorProfile(supabase, user.id, 'My Business')
				} else {
					await supabase.from('riders').upsert(
						{
							user_id: user.id,
							approved: false
						},
						{ onConflict: 'user_id' }
					)
				}
			}

			const { data: refreshedProfile } = await supabase
				.from('users')
				.select('role')
				.eq('id', user.id)
				.single()

			router.replace(
				getRoleRedirectPath(refreshedProfile?.role || 'vendor')
			)
		}

		resolveAndRedirect()
	}, [router, supabase])

	return (
		<div className='min-h-screen bg-charcoal-950 flex flex-col items-center justify-center gap-4'>
			<Loader2 className='text-emerald-500 animate-spin' size={40} />
			<p className='text-charcoal-500 font-black text-xs uppercase tracking-widest'>
				Entering Network...
			</p>
		</div>
	)
}
