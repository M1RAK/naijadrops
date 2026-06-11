'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

function GoogleIcon() {
	return (
		<svg viewBox='0 0 24 24' width='18' height='18' fill='none'>
			<path
				fill='#4285F4'
				d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
			/>
			<path
				fill='#34A853'
				d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
			/>
			<path
				fill='#FBBC05'
				d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
			/>
			<path
				fill='#EA4335'
				d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
			/>
		</svg>
	)
}

export default function LoginPage() {
	const [googleLoading, setGoogleLoading] = useState(false)
	const [error, setError] = useState(null)
	const supabase = createClient()
	const router = useRouter()

	async function handleGoogle() {
		setGoogleLoading(true)
		setError(null)
		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${window.location.origin}/auth/callback`,
				queryParams: { access_type: 'offline', prompt: 'consent' }
			}
		})
		if (error) {
			setError(error.message)
			setGoogleLoading(false)
		}
		// On success the browser navigates away — no cleanup needed
	}

	return (
		<main className='min-h-screen bg-charcoal-950 flex flex-col items-center justify-center p-6 relative overflow-hidden'>
			{/* Ambient background */}
			<div className='absolute inset-0 pointer-events-none'>
				<div className='absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,#10b98114,transparent_65%)]' />
				<div className='absolute bottom-0 left-1/2 -translate-x-1/2 w-175 h-87.5 bg-emerald-500/4 blur-[120px] rounded-full' />
			</div>

			<motion.div
				initial={{ opacity: 0, y: 28 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
				className='w-full max-w-sm relative z-10'>
				{/* Brand */}
				<div className='text-center mb-8'>
					<div className='inline-flex items-center gap-2.5 mb-5'>
						<div className='w-10 h-10 bg-emerald-500 rounded-[14px] flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.45)]'>
							<span className='text-charcoal-950 font-black text-[17px] font-outfit'>
								N
							</span>
						</div>
						<span className='text-white font-black text-xl tracking-tight font-outfit'>
							NaijaDrops
						</span>
					</div>
					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.2 }}>
						<h1 className='text-2xl font-black text-white tracking-tight'>
							Welcome to NaijaDrops
						</h1>
						<p className='text-charcoal-500 text-sm mt-1 font-medium'>
							Sign in to send or deliver packages
						</p>
					</motion.div>
				</div>

				<div className='bg-white/4 border border-white/8 rounded-[1.75rem] p-6 shadow-2xl'>
					<AnimatePresence mode='wait'>
						<motion.div
							key='login'
							initial={{ opacity: 0, x: 12 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -12 }}
							transition={{ duration: 0.2 }}
							className='space-y-4'>
							<button
								onClick={handleGoogle}
								disabled={googleLoading}
								className='w-full flex items-center justify-center gap-3 py-4 bg-white hover:bg-gray-50 text-charcoal-900 font-semibold rounded-xl transition-all text-sm active:scale-[0.98] disabled:opacity-60 shadow-sm'>
								{googleLoading ? (
									<Loader2
										className='animate-spin text-charcoal-400'
										size={18}
									/>
								) : (
									<GoogleIcon />
								)}
								Continue with Google
							</button>

							<AnimatePresence>
								{error && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{
											opacity: 1,
											height: 'auto'
										}}
										exit={{ opacity: 0, height: 0 }}
										className='flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl overflow-hidden'>
										<AlertCircle
											className='text-red-400 shrink-0 mt-0.5'
											size={13}
										/>
										<p className='text-red-400 text-xs font-medium leading-relaxed'>
											{error}
										</p>
									</motion.div>
								)}
							</AnimatePresence>
						</motion.div>
					</AnimatePresence>
				</div>

				<p className='text-center mt-6 text-charcoal-700 text-[10px] font-bold uppercase tracking-[0.2em]'>
					Secure · Encrypted · Kano-Ready
				</p>
			</motion.div>
		</main>
	)
}
