'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, X } from 'lucide-react'

export default function DriverNotifications({ profile, isOnline }) {
	const supabase = createClient()
	const [notification, setNotification] = useState(null)

	useEffect(() => {
		if (!isOnline || !profile) return

		// Listen for NEW orders that match the driver's vehicle
		const channel = supabase
			.channel('driver-pings')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'orders',
					filter: `status=eq.pending`
				},
				(payload) => {
					if (payload.new.vehicle_type === profile.vehicle_type) {
						triggerPing(
							`New Order: ${payload.new.item_category}`,
							`Proposed Fare: ₦${payload.new.agreed_price?.toLocaleString()}`
						)
					}
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'orders',
					filter: `rider_user_id=eq.${profile.user_id}`
				},
				(payload) => {
					// Fires when escrow is authorized and the order moves
					// from 'matched' to 'assigned'
					if (payload.new.status === 'assigned') {
						triggerPing(
							'Payment Confirmed!',
							'Proceed to pickup immediately.'
						)
					}
				}
			)
			.subscribe()

		return () => supabase.removeChannel(channel)
	}, [isOnline, profile])

	function triggerPing(title, sub) {
		try {
			const audio = new Audio('/ping.mp3')
			audio.play()
		} catch {}

		setNotification({ title, sub })
		setTimeout(() => setNotification(null), 8000)
	}

	return (
		<AnimatePresence>
			{notification && (
				<motion.div
					initial={{ y: -100, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: -100, opacity: 0 }}
					className='fixed top-24 left-5 right-5 z-[100]'>
					<div className='bg-emerald-500 rounded-3xl p-5 shadow-[0_20px_50px_rgba(16,185,129,0.4)] flex items-center gap-4 border border-white/20'>
						<div className='w-12 h-12 bg-charcoal-950/20 rounded-2xl flex items-center justify-center text-charcoal-950'>
							<Zap size={24} fill='currentColor' />
						</div>
						<div className='flex-1'>
							<div className='text-charcoal-950 font-black text-sm uppercase tracking-tight'>
								{notification.title}
							</div>
							<div className='text-charcoal-950/70 text-xs font-bold'>
								{notification.sub}
							</div>
						</div>
						<button
							onClick={() => setNotification(null)}
							className='w-8 h-8 flex items-center justify-center text-charcoal-950/50 hover:text-charcoal-950 transition-colors'>
							<X size={18} />
						</button>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
