'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { ensureUserProfile } from '@/services/auth.service'
import { ensureVendorProfile } from '@/services/vendors.service'
import {
	ArrowLeft,
	Zap,
	CheckCircle2,
	X,
	Loader2,
	AlertCircle,
	Lock
} from 'lucide-react'

const DRAFT_KEY = 'nd_order_draft'

function Step3Content() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const supabase = createClient()

	const [draft, setDraft] = useState(null)
	const [orderId, setOrderId] = useState(searchParams.get('orderId') || null)
	const [matchState, setMatchState] = useState('idle') // idle | searching | found | accepted | no_drivers
	const [matchedRider, setMatchedRider] = useState(null)
	const [creatingOrder, setCreatingOrder] = useState(false)
	const [error, setError] = useState(null)
	const [showAuthGate, setShowAuthGate] = useState(false)

	const channelRef = useRef(null)

	// Load draft on mount
	useEffect(() => {
		try {
			const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY))
			if (!d?.pickup || !d?.estimated_price) {
				router.replace('/send-package/step-2')
				return
			}
			setDraft(d)
			if (d.orderId) {
				setOrderId(d.orderId)
				setMatchState('searching')
				startQuickMatch(d.orderId)
			}
		} catch {
			router.replace('/send-package/step-2')
		}
	}, [])

	// Clean up realtime channel on unmount
	useEffect(() => {
		return () => {
			if (channelRef.current) supabase.removeChannel(channelRef.current)
		}
	}, [])

	async function handleFindDriver() {
		const {
			data: { user }
		} = await supabase.auth.getUser()
		if (!user) {
			setShowAuthGate(true)
			return
		}
		await createOrder()
	}

	async function createOrder() {
		setCreatingOrder(true)
		setMatchState('searching')
		setError(null)
		try {
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) {
				setShowAuthGate(true)
				setCreatingOrder(false)
				return
			}

			await ensureUserProfile(supabase, user.id, {
				role: 'vendor',
				name: user.user_metadata?.full_name || user.email?.split('@')[0] || null
			})

			const vendorProfile = await ensureVendorProfile(
				supabase,
				user.id,
				user.email?.split('@')[0] || 'My Business'
			)

			const { data: order, error: err } = await supabase
				.from('orders')
				.insert({
					vendor_id: vendorProfile.id,
					pickup_name: draft.pickup.name,
					pickup_lat: draft.pickup.lat,
					pickup_lng: draft.pickup.lng,
					dropoff_name: draft.dropoff.name,
					dropoff_lat: draft.dropoff.lat,
					dropoff_lng: draft.dropoff.lng,
					item_size: draft.size,
					vehicle_type: draft.vehicle,
					item_description: draft.description,
					recipient_name: draft.recipient_name,
					recipient_phone: draft.recipient_phone,
					agreed_price: draft.estimated_price,
					status: 'pending'
				})
				.select()
				.single()

			if (err) throw err

			setOrderId(order.id)
			sessionStorage.setItem(
				DRAFT_KEY,
				JSON.stringify({ ...draft, orderId: order.id })
			)
			startQuickMatch(order.id)
		} catch (e) {
			setError('Failed to create order: ' + e.message)
			setMatchState('idle')
		} finally {
			setCreatingOrder(false)
		}
	}

	async function startQuickMatch(oid) {
		setMatchState('searching')

		// Listen for rider assignment via realtime
		const channel = supabase
			.channel(`order-match-${oid}`)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'orders',
					filter: `id=eq.${oid}`
				},
				async (payload) => {
					if (
						payload.new.rider_id &&
						payload.new.status === 'matched'
					) {
						const { data: rider } = await supabase
							.from('riders')
							.select('*, users(full_name, email)')
							.eq('id', payload.new.rider_id)
							.single()

						setMatchedRider({
							id: payload.new.rider_id,
							name: rider?.users?.full_name || 'Driver',
							vehicle_type: rider?.vehicle_type || 'bike',
							rating: rider?.rating || 5.0,
							eta_min: Math.round(5 + Math.random() * 10),
							price: payload.new.agreed_price
						})
						setMatchState('found')
					}
				}
			)
			.subscribe()

		channelRef.current = channel

		// Trigger dispatch engine
		try {
			const response = await fetch('/api/dispatch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ orderId: oid })
			})
			const data = await response.json()
			if (!data.success) {
				setMatchState('no_drivers')
				setError(data.message)
			}
		} catch (e) {
			console.error('Dispatch error:', e)
			setMatchState('no_drivers')
		}
	}

	async function cancelMatch() {
		if (!orderId) return
		if (channelRef.current) supabase.removeChannel(channelRef.current)
		setMatchedRider(null)
		setMatchState('searching')
		await supabase
			.from('orders')
			.update({ rider_id: null, status: 'pending' })
			.eq('id', orderId)
		startQuickMatch(orderId)
	}

	async function acceptMatch() {
		if (!matchedRider) return
		await supabase
			.from('riders')
			.update({ operational_status: 'awaiting_payment' })
			.eq('user_id', matchedRider.id)
		setMatchState('accepted')
		setTimeout(
			() => router.push(`/send-package/confirm?orderId=${orderId}`),
			800
		)
	}

	if (!draft)
		return (
			<div className='min-h-screen bg-charcoal-950 flex items-center justify-center'>
				<div className='w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin' />
			</div>
		)

	return (
		<div className='min-h-dvh bg-charcoal-950 flex flex-col'>
			{/* Header */}
			<div className='flex items-center gap-4 px-5 pt-14 pb-5'>
				<button
					onClick={() => router.push('/send-package/step-2')}
					className='w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors'>
					<ArrowLeft size={18} />
				</button>
				<div>
					<div className='text-[10px] font-black text-charcoal-500 uppercase tracking-widest'>
						Step 3 of 3
					</div>
					<h1 className='text-xl font-black text-white tracking-tight'>
						Find a Driver
					</h1>
				</div>
				<div className='ml-auto flex gap-1.5'>
					{[1, 2, 3].map((s) => (
						<div
							key={s}
							className='h-1.5 w-6 rounded-full bg-emerald-500'
						/>
					))}
				</div>
			</div>

			{/* Auth Gate Modal */}
			<AnimatePresence>
				{showAuthGate && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className='fixed inset-0 bg-charcoal-950/90 backdrop-blur-md z-50 flex items-end justify-center pb-10 px-5'>
						<motion.div
							initial={{ y: 80, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							exit={{ y: 80, opacity: 0 }}
							className='w-full max-w-sm bg-charcoal-900 border border-white/10 rounded-4xl p-8 text-center'>
							<div className='w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6'>
								<Lock size={28} className='text-emerald-500' />
							</div>
							<h2 className='text-xl font-black text-white mb-3'>
								Almost there!
							</h2>
							<p className='text-charcoal-400 text-sm leading-relaxed mb-8'>
								Create a free account to confirm your delivery.
								Your route and pricing are saved.
							</p>
							<button
								onClick={() =>
									router.push(
										'/auth/login?next=/send-package/step-3'
									)
								}
								className='w-full bg-emerald-500 hover:bg-emerald-400 text-charcoal-950 font-black py-4 rounded-2xl mb-3 transition-all'>
								Create Free Account
							</button>
							<button
								onClick={() => setShowAuthGate(false)}
								className='w-full py-4 text-charcoal-500 font-bold text-sm'>
								← Back to preview
							</button>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Idle — summary + find driver button */}
			{matchState === 'idle' && (
				<div className='flex-1 flex flex-col items-center justify-center px-5 pb-10'>
					<div className='w-full max-w-sm bg-white/4 border border-white/10 rounded-3xl p-6 mb-8'>
						<div className='text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4'>
							Your Delivery Summary
						</div>
						<div className='space-y-3'>
							<div className='flex justify-between text-sm'>
								<span className='text-charcoal-500 font-bold'>
									From
								</span>
								<span className='text-white font-black text-right max-w-45 truncate'>
									{draft.pickup?.name}
								</span>
							</div>
							<div className='flex justify-between text-sm'>
								<span className='text-charcoal-500 font-bold'>
									To
								</span>
								<span className='text-white font-black text-right max-w-45 truncate'>
									{draft.dropoff?.name}
								</span>
							</div>
							<div className='flex justify-between text-sm'>
								<span className='text-charcoal-500 font-bold'>
									Estimated Fare
								</span>
								<span className='text-emerald-400 font-black'>
									₦{draft.estimated_price?.toLocaleString()}
								</span>
							</div>
						</div>
					</div>

					{error && (
						<div className='w-full max-w-sm mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold'>
							{error}
						</div>
					)}

					<button
						onClick={handleFindDriver}
						disabled={creatingOrder}
						className='w-full max-w-sm bg-emerald-500 hover:bg-emerald-400 text-charcoal-950 font-black py-5 rounded-2xl text-lg flex items-center justify-center gap-3 shadow-[0_0_24px_rgba(16,185,129,0.3)] transition-all active:scale-95 disabled:opacity-50'>
						{creatingOrder ? (
							<Loader2 size={22} className='animate-spin' />
						) : (
							<>
								<Zap size={22} /> Find My Driver
							</>
						)}
					</button>
					<p className='text-charcoal-600 text-xs font-bold mt-4 uppercase tracking-widest'>
						No payment until delivery
					</p>
				</div>
			)}

			{/* Searching */}
			{matchState === 'searching' && (
				<div className='flex-1 flex flex-col items-center justify-center px-5'>
					<div className='relative mb-8'>
						<div className='w-32 h-32 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center'>
							<div className='w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center'>
								<Loader2
									size={32}
									className='text-emerald-500 animate-spin'
								/>
							</div>
						</div>
						<div className='absolute inset-0 w-32 h-32 rounded-full border border-emerald-500/30 animate-ping opacity-20' />
					</div>
					<h2 className='text-white font-black text-xl mb-2'>
						Finding nearby drivers…
					</h2>
					<p className='text-charcoal-500 text-sm text-center max-w-60'>
						Scanning riders within 3km of your pickup point
					</p>
				</div>
			)}

			{/* Driver Found */}
			{matchState === 'found' && matchedRider && (
				<div className='flex-1 flex flex-col justify-center px-5'>
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className='bg-white/4 border border-white/10 rounded-3xl p-5 relative overflow-hidden'>
						<div className='absolute top-0 right-0 px-3 py-1 bg-emerald-500 text-charcoal-950 font-black text-[10px] uppercase tracking-widest rounded-bl-xl'>
							Best Match
						</div>
						<div className='flex items-center gap-4 mb-5'>
							<div className='w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-3xl border border-emerald-500/20'>
								{matchedRider.vehicle_type === 'car'
									? '🚗'
									: '🏍️'}
							</div>
							<div className='flex-1'>
								<div className='text-white font-black text-xl'>
									{matchedRider.name}
								</div>
								<div className='flex items-center gap-2 mt-1'>
									<div className='flex items-center gap-1 text-amber-400 font-black text-xs'>
										⭐ {matchedRider.rating}
									</div>
									<span className='text-charcoal-600'>·</span>
									<span className='text-white font-black text-lg'>
										₦{matchedRider.price?.toLocaleString()}
									</span>
								</div>
							</div>
						</div>

						<div className='flex gap-3'>
							<button
								onClick={cancelMatch}
								className='flex-1 py-4 bg-white/5 border border-white/10 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest'>
								Cancel
							</button>
							<button
								onClick={acceptMatch}
								className='flex-2 bg-emerald-500 hover:bg-emerald-400 text-charcoal-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]'>
								Accept Driver <Zap size={18} />
							</button>
						</div>
					</motion.div>
				</div>
			)}

			{/* Accepted */}
			{matchState === 'accepted' && (
				<div className='flex-1 flex flex-col items-center justify-center px-5'>
					<div className='w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mb-6'>
						<CheckCircle2 size={40} className='text-emerald-400' />
					</div>
					<h2 className='text-white font-black text-2xl mb-2'>
						Driver Accepted!
					</h2>
					<p className='text-charcoal-500 text-sm'>
						Redirecting to confirmation…
					</p>
				</div>
			)}

			{/* No Drivers */}
			{matchState === 'no_drivers' && (
				<div className='flex-1 flex flex-col items-center justify-center px-5 text-center'>
					<div className='w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mb-6'>
						<AlertCircle size={36} className='text-amber-400' />
					</div>
					<h2 className='text-white font-black text-xl mb-3'>
						No drivers nearby
					</h2>
					<p className='text-charcoal-400 text-sm mb-8 leading-relaxed max-w-65'>
						No riders available right now. Please try again in a few
						minutes.
					</p>
					<button
						onClick={() => {
							setMatchState('idle')
							setError(null)
						}}
						className='bg-white/5 border border-white/10 text-white font-black px-8 py-4 rounded-2xl hover:bg-white/10 transition-all'>
						Try Again
					</button>
				</div>
			)}
		</div>
	)
}

export default function Step3Page() {
	return (
		<Suspense
			fallback={
				<div className='min-h-screen bg-charcoal-950 flex items-center justify-center'>
					<div className='w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin' />
				</div>
			}>
			<Step3Content />
		</Suspense>
	)
}
