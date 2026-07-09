'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
	Phone,
	CheckCircle2,
	Loader2,
	ShieldAlert,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

// Dynamically import the map to avoid SSR issues
const TrackingMap = dynamic(() => import('@/components/TrackingMap'), {
	ssr: false,
	loading: () => (
		<div className='w-full h-full bg-charcoal-900 flex items-center justify-center'>
			<Loader2 className='text-emerald-500 animate-spin' size={24} />
		</div>
	)
})

// ─── Types ─────────────────────────────────────────────────────────────────

type OrderStatus =
	| 'pending'
	| 'matched'
	| 'assigned'
	| 'picked_up'
	| 'in_transit'
	| 'delivered'
	| 'cancelled'

interface Order {
	id: string
	status: OrderStatus
	pickup_name: string
	pickup_lat: number
	pickup_lng: number
	dropoff_name: string
	dropoff_lat: number
	dropoff_lng: number
	agreed_price: number
	item_description: string | null
	recipient_name: string | null
	recipient_phone: string | null
	rider_id: string | null
	delivery_pin: string | null
}

interface RiderLocation {
	lat: number
	lng: number
}

// ─── Status config ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
	OrderStatus,
	{ label: string; color: string; bg: string }
> = {
	pending: {
		label: 'Finding your rider…',
		color: 'text-amber-400',
		bg: 'bg-amber-500/10 border-amber-500/20'
	},
	matched: {
		label: 'Rider matched',
		color: 'text-blue-400',
		bg: 'bg-blue-500/10 border-blue-500/20'
	},
	assigned: {
		label: 'Rider heading to pickup',
		color: 'text-blue-400',
		bg: 'bg-blue-500/10 border-blue-500/20'
	},
	picked_up: {
		label: 'Package picked up',
		color: 'text-emerald-400',
		bg: 'bg-emerald-500/10 border-emerald-500/20'
	},
	in_transit: {
		label: 'On the way to you',
		color: 'text-emerald-400',
		bg: 'bg-emerald-500/10 border-emerald-500/20'
	},
	delivered: {
		label: 'Delivered',
		color: 'text-emerald-400',
		bg: 'bg-emerald-500/10 border-emerald-500/20'
	},
	cancelled: {
		label: 'Cancelled',
		color: 'text-red-400',
		bg: 'bg-red-500/10 border-red-500/20'
	}
}

// ─── Component ─────────────────────────────────────────────────────────────

function TrackingContent() {
	const params = useParams()
	const searchParams = useSearchParams()
	const router = useRouter()
	const supabase = createClient()

	const orderId = params.orderId as string
	const openChat = searchParams.get('openChat') === '1'
	const paymentVerifying = searchParams.get('payment') === 'verifying'

	const [order, setOrder] = useState<Order | null>(null)
	const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(
		null
	)
	const [loading, setLoading] = useState(true)
	const [notFound, setNotFound] = useState(false)

	// ── Initial load ──────────────────────────────────────────────────────────

	useEffect(() => {
		if (!orderId) return

		async function fetchOrder() {
			const { data, error } = await supabase
				.from('orders')
				.select('*')
				.eq('id', orderId)
				.single()

			if (error || !data) {
				setNotFound(true)
				setLoading(false)
				return
			}

			setOrder(data as Order)

			// If there's a rider, fetch their current location
			if (data.rider_id) {
				const { data: rider } = await supabase
					.from('riders')
					.select('current_lat, current_lng')
					.eq('user_id', data.rider_id)
					.single()

				if (rider?.current_lat && rider?.current_lng) {
					setRiderLocation({
						lat: rider.current_lat,
						lng: rider.current_lng
					})
				}
			}

			setLoading(false)
		}

		fetchOrder()
	}, [orderId])

	// ── Realtime subscriptions ─────────────────────────────────────────────

	useEffect(() => {
		if (!orderId) return

		// Subscribe to order status changes
		const orderChannel = supabase
			.channel(`tracking-order-${orderId}`)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'orders',
					filter: `id=eq.${orderId}`
				},
				(payload) => {
					setOrder((prev) =>
						prev ? { ...prev, ...(payload.new as Order) } : null
					)
				}
			)
			.subscribe()

		// Subscribe to rider location updates
		const riderChannel = supabase
			.channel(`tracking-rider-${orderId}`)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'riders' },
				(payload) => {
					const updated = payload.new
					if (
						order?.rider_id &&
						updated.user_id === order.rider_id &&
						updated.current_lat &&
						updated.current_lng
					) {
						setRiderLocation({
							lat: updated.current_lat,
							lng: updated.current_lng
						})
					}
				}
			)
			.subscribe()

		return () => {
			supabase.removeChannel(orderChannel)
			supabase.removeChannel(riderChannel)
		}
	}, [orderId, order?.rider_id])

	// ── Loading / error states ─────────────────────────────────────────────

	if (loading) {
		return (
			<div className='min-h-screen bg-charcoal-950 flex items-center justify-center'>
				<Loader2 className='text-emerald-500 animate-spin' size={32} />
			</div>
		)
	}

	if (notFound || !order) {
		return (
			<div className='min-h-screen bg-charcoal-950 flex flex-col items-center justify-center p-8 text-center'>
				<div className='w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6'>
					<ShieldAlert className='text-charcoal-500' size={36} />
				</div>
				<h2 className='text-xl font-black text-white mb-2'>
					Order Not Found
				</h2>
				<p className='text-charcoal-500 text-sm mb-8'>
					This order doesn&apos;t exist or you don&apos;t have access
					to it.
				</p>
				<button
					onClick={() => router.push('/dashboard')}
					className='bg-emerald-500 text-charcoal-950 font-black px-8 py-3 rounded-2xl'>
					Back to Dashboard
				</button>
			</div>
		)
	}

	// ── Delivered state ────────────────────────────────────────────────────

	if (order.status === 'delivered') {
		return (
			<div className='min-h-screen bg-charcoal-950 flex flex-col items-center justify-center p-8 text-center'>
				<motion.div
					initial={{ scale: 0.8, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					className='w-24 h-24 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mb-8'>
					<CheckCircle2 className='text-emerald-400' size={48} />
				</motion.div>
				<h2 className='text-3xl font-black text-white mb-3 tracking-tight'>
					Delivered!
				</h2>
				<p className='text-charcoal-400 text-sm mb-2'>
					Your package reached{' '}
					<strong className='text-white'>{order.dropoff_name}</strong>
				</p>
				<p className='text-emerald-400 font-black text-xl mb-10'>
					₦{order.agreed_price.toLocaleString()}
				</p>
				<button
					onClick={() => router.push('/dashboard')}
					className='bg-emerald-500 hover:bg-emerald-400 text-charcoal-950 font-black px-10 py-4 rounded-2xl transition-all'>
					Back to Dashboard
				</button>
			</div>
		)
	}

	// ── Cancelled state ────────────────────────────────────────────────────

	if (order.status === 'cancelled') {
		return (
			<div className='min-h-screen bg-charcoal-950 flex flex-col items-center justify-center p-8 text-center'>
				<div className='w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6'>
					<ShieldAlert className='text-red-400' size={36} />
				</div>
				<h2 className='text-xl font-black text-white mb-2'>
					Order Cancelled
				</h2>
				<p className='text-charcoal-500 text-sm mb-8'>
					This order was cancelled. No payment was taken.
				</p>
				<button
					onClick={() => router.push('/dashboard')}
					className='bg-white/5 border border-white/10 text-white font-black px-8 py-3 rounded-2xl'>
					Back to Dashboard
				</button>
			</div>
		)
	}

	const statusConfig = STATUS_CONFIG[order.status]

	// ── Active tracking view ───────────────────────────────────────────────

	return (
		<div className='min-h-screen bg-charcoal-950 flex flex-col'>
			{/* Map */}
			<div className='h-[45vh] relative'>
				<TrackingMap
					driverLocation={riderLocation}
					dropoffLocation={{
						lat: order.dropoff_lat,
						lng: order.dropoff_lng
					}}
				/>

				{paymentVerifying &&
					(order.status === 'matched' ||
						order.status === 'pending') && (
						<div className='absolute top-4 inset-x-4 flex justify-center pointer-events-none z-20'>
							<div className='px-4 py-2 rounded-full border backdrop-blur-md flex items-center gap-2 bg-blue-500/10 border-blue-500/20'>
								<div className='w-2 h-2 rounded-full animate-pulse bg-blue-400' />
								<span className='text-xs font-black uppercase tracking-widest text-blue-400'>
									Confirming payment…
								</span>
							</div>
						</div>
					)}

				{/* Status pill overlay */}
				<div className='absolute top-14 inset-x-4 flex justify-center pointer-events-none'>
					<div
						className={`px-4 py-2 rounded-full border backdrop-blur-md flex items-center gap-2 ${statusConfig.bg}`}>
						<div
							className={`w-2 h-2 rounded-full animate-pulse ${statusConfig.color} bg-current`}
						/>
						<span
							className={`text-xs font-black uppercase tracking-widest ${statusConfig.color}`}>
							{statusConfig.label}
						</span>
					</div>
				</div>
			</div>

			{/* Order details panel */}
			<div className='flex-1 px-5 pt-6 pb-10 space-y-4 overflow-y-auto'>
				{/* Route card */}
				<div className='bg-white/4 border border-white/10 rounded-3xl p-5 space-y-4'>
					<div className='text-[10px] font-black text-charcoal-500 uppercase tracking-widest'>
						Route
					</div>
					<div className='space-y-3 relative'>
						<div className='absolute left-3 top-3 bottom-3 w-0.5 bg-white/5' />
						<div className='flex items-start gap-4'>
							<div className='w-6 h-6 bg-charcoal-700 border-2 border-charcoal-600 rounded-full flex items-center justify-center shrink-0 z-10'>
								<div className='w-2 h-2 bg-white rounded-full' />
							</div>
							<div>
								<div className='text-[10px] font-black text-charcoal-500 uppercase mb-0.5'>
									Pickup
								</div>
								<div className='text-white font-semibold text-sm'>
									{order.pickup_name}
								</div>
							</div>
						</div>
						<div className='flex items-start gap-4'>
							<div className='w-6 h-6 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center shrink-0 z-10'>
								<div className='w-2 h-2 bg-emerald-400 rounded-full animate-pulse' />
							</div>
							<div>
								<div className='text-[10px] font-black text-emerald-500 uppercase mb-0.5'>
									Dropoff
								</div>
								<div className='text-white font-semibold text-sm'>
									{order.dropoff_name}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Price + recipient */}
				<div className='grid grid-cols-2 gap-3'>
					<div className='bg-white/4 border border-white/10 rounded-2xl p-4'>
						<div className='text-[10px] font-black text-charcoal-500 uppercase tracking-widest mb-1'>
							Fare
						</div>
						<div className='text-emerald-400 font-black text-xl'>
							₦{order.agreed_price.toLocaleString()}
						</div>
					</div>
					{order.recipient_name && (
						<div className='bg-white/4 border border-white/10 rounded-2xl p-4'>
							<div className='text-[10px] font-black text-charcoal-500 uppercase tracking-widest mb-1'>
								Recipient
							</div>
							<div className='text-white font-black text-sm truncate'>
								{order.recipient_name}
							</div>
							{order.recipient_phone && (
								<a
									href={`tel:${order.recipient_phone}`}
									className='text-emerald-400 text-xs font-bold flex items-center gap-1 mt-1'>
									<Phone size={10} /> {order.recipient_phone}
								</a>
							)}
						</div>
					)}
				</div>

				{/* Delivery PIN — only shown when in transit */}
				{order.delivery_pin && order.status === 'in_transit' && (
					<div className='bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-center'>
						<div className='text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2'>
							Delivery PIN — give this to your rider
						</div>
						<div className='text-5xl font-black text-white tracking-[0.3em]'>
							{order.delivery_pin}
						</div>
					</div>
				)}

				{/* Description */}
				{order.item_description && (
					<div className='bg-white/2 border border-white/5 rounded-2xl p-4'>
						<div className='text-[10px] font-black text-charcoal-500 uppercase tracking-widest mb-1'>
							Package
						</div>
						<div className='text-charcoal-300 text-sm font-medium'>
							{order.item_description}
						</div>
					</div>
				)}

				{/* CTA — go back to dashboard */}
				<button
					onClick={() => router.push('/dashboard')}
					className='w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all'>
					Back to Dashboard
				</button>
			</div>
		</div>
	)
}

// Wrap in Suspense because useSearchParams requires it in Next.js App Router
export default function TrackingPage() {
	return (
		<Suspense
			fallback={
				<div className='min-h-screen bg-charcoal-950 flex items-center justify-center'>
					<Loader2
						className='text-emerald-500 animate-spin'
						size={32}
					/>
				</div>
			}>
			<TrackingContent />
		</Suspense>
	)
}
