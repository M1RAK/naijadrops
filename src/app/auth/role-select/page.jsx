'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Headless redirect — no longer needs to set a role.
 * The DB trigger creates users + vendors at signup.
 * Just send everyone to /auth/resolve to detect their portal.
 */
export default function RoleSelectRedirect() {
	const router = useRouter()

	useEffect(() => {
		router.replace('/auth/resolve')
	}, [router])

	return (
		<div className='min-h-screen bg-charcoal-950 flex flex-col items-center justify-center gap-4'>
			<Loader2 className='text-emerald-500 animate-spin' size={40} />
			<p className='text-charcoal-500 font-black text-xs uppercase tracking-widest'>
				Entering Network...
			</p>
		</div>
	)
}

