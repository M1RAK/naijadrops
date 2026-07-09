'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, MapPin, ShieldCheck, Search, Globe } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
	const [isLoggedIn, setIsLoggedIn] = useState(false)
	const supabase = createClient()
	const router = useRouter()

	useEffect(() => {
		supabase.auth.getUser().then(({ data: { user } }) => {
			setIsLoggedIn(!!user)
		})
	}, [])

	async function handleGoogleSignIn() {
		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${window.location.origin}/auth/callback`,
				queryParams: { access_type: 'offline', prompt: 'consent' }
			}
		})

		if (error) {
			console.error('Google sign-in failed:', error.message)
			router.push('/auth/login')
		}
	}

	return (
		<main className='min-h-screen bg-charcoal-950 text-white selection:bg-emerald-500/30 overflow-x-hidden'>
			{/* Ambient background */}
			<div className='fixed inset-0 z-0 pointer-events-none'>
				<div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,#10b98112,transparent_70%)]' />
				<div className='absolute top-0 left-1/2 -translate-x-1/2 w-250 h-150 bg-emerald-500/3 blur-[120px] rounded-full' />
			</div>

			{/* Nav */}
			<nav className='relative z-20 flex justify-between items-center p-6 lg:px-12 max-w-7xl mx-auto'>
				<div className='flex items-center gap-2.5'>
					<div className='w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]'>
						<span className='text-charcoal-950 font-black text-base font-outfit'>
							N
						</span>
					</div>
					<span className='text-white font-black text-lg tracking-tight font-outfit'>
						NaijaDrops
					</span>
				</div>
				<button
					onClick={
						isLoggedIn
							? () => router.push('/auth/resolve')
							: handleGoogleSignIn
					}
					className='px-5 py-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-white text-[11px] font-black uppercase tracking-widest'>
					{isLoggedIn ? 'Go to Dashboard' : 'Sign In'}
				</button>
			</nav>

			{/* Hero */}
			<section className='relative z-10 pt-16 pb-24 px-6 max-w-7xl mx-auto text-center'>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
					<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8'>
						<Globe size={12} className='animate-pulse' /> Precision
						Logistics · Kano, NG
					</div>
					<h1 className='text-5xl md:text-7xl font-black text-white tracking-tighter leading-none mb-6 font-outfit'>
						Logistics that moves <br />
						<span className='text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-emerald-600 italic'>
							at your speed.
						</span>
					</h1>
					<p className='text-charcoal-400 font-medium max-w-2xl mx-auto text-lg md:text-xl leading-relaxed mb-16 px-4'>
						Reliable, real-time dispatch for business owners and
						professional carriers across the city.
					</p>
				</motion.div>

				{/* Single CTA — no role choice at this stage */}
				<div className='flex flex-col items-center gap-4'>
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.98 }}
						onClick={handleGoogleSignIn}
						className='group relative bg-emerald-500 hover:bg-emerald-400 text-charcoal-950 px-12 py-6 rounded-3xl font-black text-xl uppercase tracking-wider shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all flex items-center gap-3'>
						Get Started
						<ArrowRight
							size={24}
							className='group-hover:translate-x-1.5 transition-transform'
						/>
					</motion.button>
					<p className='text-charcoal-600 text-xs font-bold uppercase tracking-[0.2em]'>
						Want to earn delivering? Apply inside the app after
						signing in.
					</p>
				</div>

				{/* Trust stats */}
				<div className='flex flex-wrap justify-center gap-12 border-t border-white/5 pt-16 mt-16'>
					<div className='flex items-center gap-3'>
						<MapPin className='text-emerald-500' size={20} />
						<div className='text-left'>
							<div className='text-white font-black text-xl leading-none'>
								Precise
							</div>
							<div className='text-charcoal-600 text-[10px] font-bold uppercase tracking-widest'>
								Pin Resolution
							</div>
						</div>
					</div>
					<div className='flex items-center gap-3'>
						<ShieldCheck className='text-emerald-500' size={20} />
						<div className='text-left'>
							<div className='text-white font-black text-xl leading-none'>
								Verified
							</div>
							<div className='text-charcoal-600 text-[10px] font-bold uppercase tracking-widest'>
								Professional Fleet
							</div>
						</div>
					</div>
					<div className='flex items-center gap-3'>
						<Search className='text-emerald-500' size={20} />
						<div className='text-left'>
							<div className='text-white font-black text-xl leading-none'>
								Live
							</div>
							<div className='text-charcoal-600 text-[10px] font-bold uppercase tracking-widest'>
								Map Tracking
							</div>
						</div>
					</div>
				</div>
			</section>

			<footer className='relative z-10 border-t border-white/5 py-12 px-6'>
				<div className='max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6'>
					<div className='text-charcoal-600 text-sm'>
						© 2026 NaijaDrops Technologies. All rights reserved.
					</div>
					<div className='flex gap-6 text-xs font-bold uppercase tracking-widest text-charcoal-500'>
						<a href='/terms' className='hover:text-white'>
							Terms
						</a>
						<a href='/privacy' className='hover:text-white'>
							Privacy
						</a>
						<a href='/ops-terminal' className='hover:text-white'>
							Ops Terminal
						</a>
					</div>
				</div>
			</footer>
		</main>
	)
}
