'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
	ArrowLeft,
	CheckCircle2,
	CreditCard,
	Lock,
	ShieldCheck,
	ChevronRight,
	Loader2,
	AlertTriangle
} from 'lucide-react'
import { loadPaystackScript, initializePaystack } from '@/utils/paystack'
import { motion, AnimatePresence } from 'framer-motion'

function PaymentContent() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const orderId = searchParams.get('orderId')
	const supabase = createClient()

	const [orderData, setOrderData] = useState(null)
	const [driverData, setDriverData] = useState(null)
	const [isProcessing, setIsProcessing] = useState(false)
	const [isSuccess, setIsSuccess] = useState(false)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)

	useEffect(() => {
		if (!orderId) {
			router.push('/dashboard')
			return
		}

		async function fetchDetails() {
			loadPaystackScript()
			try {
				const { data: order, error: orderErr } = await supabase
					.from('orders')
					.select('*')
					.eq('id', orderId)
					.single()

				if (orderErr) throw orderErr
				setOrderData(order)

				if (order.rider_id) {
					const { data: driver } = await supabase
						.from('riders')
						.select('*, users(name)')
						.eq('id', order.rider_id)
						.single()
					setDriverData({
						...driver,
						full_name: driver?.users?.name || 'Verified Rider'
					})
				}
			} catch (err) {
				setError('Failed to load order details.')
				console.error(err)
			} finally {
				setLoading(false)
			}
		}

		fetchDetails()
	}, [orderId])

	function handlePay() {
		if (!orderData) return
		const userEmail = `${orderData.vendor_id}@naijadrops.com`

		initializePaystack({
			email: userEmail,
			amount: orderData.agreed_price,
			reference: `ND_${Date.now()}_${orderId.slice(0, 5)}`,
			onSuccess: async (response) => {
				setIsProcessing(true)
				try {
					const res = await fetch('/api/verify-payment', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							reference: response.reference,
							orderId
						})
					})
					const data = await res.json()
					if (!res.ok || !data.success)
						throw new Error(data.error || 'Verification failed')
					setIsSuccess(true)
					setTimeout(() => router.push(`/tracking/${orderId}`), 2000)
				} catch (err) {
					setError(`Payment verification failed: ${err.message}`)
				} finally {
					setIsProcessing(false)
				}
			},
			onClose: () => {}
		})
	}

	async function handleCancel() {
		if (!confirm('Cancel this order? The rider will be released.')) return
		await supabase
			.from('orders')
			.update({ status: 'cancelled' })
			.eq('id', orderId)
		router.push('/dashboard')
	}

	if (loading)
		return (
			<div className='min-h-screen aura-gradient flex items-center justify-center'>
				<Loader2 className='animate-spin text-emerald-500' size={40} />
			</div>
		)

	if (!orderData)
		return (
			<div className='min-h-screen aura-gradient flex items-center justify-center p-10 text-red-400 font-black uppercase tracking-widest'>
				Order not found.
			</div>
		)

	return (
		<main className='aura-gradient min-h-dvh flex flex-col items-center justify-start py-20 px-4'>
			<div className='w-full max-w-lg'>
				{/* Header */}
				<div className='flex items-center justify-between mb-12'>
					<button
						onClick={() => router.back()}
						className='w-12 h-12 glass-dark rounded-2xl flex items-center justify-center text-charcoal-400 hover:text-white transition-all border border-white/5'>
						<ArrowLeft size={22} />
					</button>
					<div className='glass-dark px-4 py-2 rounded-full border border-white/5 flex items-center gap-2'>
						<Lock size={14} className='text-emerald-500' />
						<span className='text-[10px] font-black text-white uppercase tracking-[0.3em]'>
							Secure Checkout
						</span>
					</div>
				</div>

				<AnimatePresence mode='wait'>
					{isSuccess ? (
						<motion.div
							key='success'
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							className='glass rounded-[3.5rem] p-12 text-center shadow-premium'>
							<div className='w-24 h-24 bg-white text-emerald-500 rounded-[3rem] flex items-center justify-center mx-auto mb-8 shadow-premium border-2 border-emerald-500/20'>
								<CheckCircle2 size={56} className='stroke-3' />
							</div>
							<h1 className='text-5xl font-black text-charcoal-900 mb-4 tracking-tighter italic'>
								Payment Done!
							</h1>
							<p className='text-charcoal-400 font-bold text-sm uppercase tracking-widest mb-6'>
								{driverData?.full_name || 'Your rider'} is on
								the way.
							</p>
							<div className='bg-charcoal-950 text-emerald-400 px-6 py-4 rounded-3xl font-black text-[10px] uppercase tracking-[0.4em] inline-block animate-pulse'>
								Redirecting to tracking…
							</div>
						</motion.div>
					) : (
						<motion.div
							key='checkout'
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className='space-y-6'>
							{/* Order Summary */}
							<div className='glass rounded-[3.5rem] p-10 shadow-premium'>
								<div className='text-center mb-8'>
									<div className='text-[10px] font-black text-charcoal-400 uppercase tracking-[0.4em] mb-2'>
										Amount Due
									</div>
									<div className='text-6xl font-black text-charcoal-900 tracking-tighter italic'>
										₦
										{orderData.agreed_price?.toLocaleString()}
									</div>
								</div>

								<div className='bg-charcoal-950/5 rounded-3xl p-6 space-y-4 border border-black/5'>
									<div className='flex justify-between items-center'>
										<span className='text-[10px] font-black text-charcoal-400 uppercase tracking-widest'>
											Rider
										</span>
										<span className='font-black text-xs text-emerald-600 uppercase flex items-center gap-2'>
											<ShieldCheck size={14} />
											{driverData?.full_name ||
												'Verified Rider'}
										</span>
									</div>
									<div className='flex justify-between items-center'>
										<span className='text-[10px] font-black text-charcoal-400 uppercase tracking-widest'>
											From
										</span>
										<span className='font-bold text-xs text-charcoal-900 truncate max-w-45'>
											{orderData.pickup_name}
										</span>
									</div>
									<div className='flex justify-between items-center'>
										<span className='text-[10px] font-black text-charcoal-400 uppercase tracking-widest'>
											To
										</span>
										<span className='font-bold text-xs text-charcoal-900 truncate max-w-45'>
											{orderData.dropoff_name}
										</span>
									</div>
								</div>

								<div className='mt-6 flex items-start gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10'>
									<ShieldCheck
										size={18}
										className='text-emerald-500 shrink-0 mt-0.5'
									/>
									<p className='text-[10px] text-charcoal-500 font-medium leading-tight uppercase tracking-tight'>
										Payment held in escrow. Released to
										rider only after delivery.
									</p>
								</div>
							</div>

							{/* Error */}
							{error && (
								<div className='p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold text-center'>
									{error}
								</div>
							)}

							{/* Pay Button */}
							<button
								onClick={handlePay}
								disabled={isProcessing}
								className='w-full py-6 rounded-[2.5rem] font-black text-xl uppercase tracking-[0.2em] bg-charcoal-900 hover:bg-black text-white flex items-center justify-center gap-4 shadow-premium transition-all active:scale-95 disabled:opacity-50'>
								{isProcessing ? (
									<Loader2
										className='animate-spin'
										size={24}
									/>
								) : (
									<>
										<CreditCard size={22} /> Pay with Card /
										USSD <ChevronRight size={22} />
									</>
								)}
							</button>

							{/* Cancel */}
							<button
								onClick={handleCancel}
								className='w-full py-5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.6em] transition-all border border-red-500/20 active:scale-95 flex items-center justify-center gap-2'>
								<AlertTriangle size={14} /> Cancel Order
							</button>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</main>
	)
}

export default function PaymentPage() {
	return (
		<Suspense
			fallback={
				<div className='min-h-screen aura-gradient flex items-center justify-center'>
					<Loader2
						className='animate-spin text-emerald-500'
						size={40}
					/>
				</div>
			}>
			<PaymentContent />
		</Suspense>
	)
}
