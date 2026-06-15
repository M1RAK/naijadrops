'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
	MapPin,
	DollarSign,
	Package,
	Loader2,
	Clock,
	CheckCircle2,
	X,
	ArrowRight
} from 'lucide-react'
import { APP_CONFIG } from '@/utils/constants'

const MATCH_EXPIRES_MS = APP_CONFIG.RIDER_MATCH_OFFER_EXPIRES_MS

function getRemainingMs(updatedAt) {
	if (!updatedAt) return 0
	const startedAt = new Date(updatedAt).getTime()
	return Math.max(0, MATCH_EXPIRES_MS - (Date.now() - startedAt))
}

function formatRemaining(ms) {
	const totalSeconds = Math.ceil(ms / 1000)
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function RiderDashboard() {
	const router = useRouter()
	const supabase = createClient()
	const [rider, setRider] = useState(null)
	const [offers, setOffers] = useState([])
	const [activeJob, setActiveJob] = useState(null)
	const [isOnline, setIsOnline] = useState(false)
	const [loading, setLoading] = useState(true)
	const [acceptingId, setAcceptingId] = useState(null)
	const [now, setNow] = useState(Date.now())

	useEffect(() => {
		const clock = window.setInterval(() => setNow(Date.now()), 1000)
		return () => window.clearInterval(clock)
	}, [])

	useEffect(() => {
		loadDashboard()

		const refreshTimer = window.setInterval(() => {
			loadDashboard()
		}, 20000)

		const channel = supabase
			.channel('rider-workspace')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'orders'
				},
				() => {
					loadDashboard()
				}
			)
			.subscribe()

		return () => {
			window.clearInterval(refreshTimer)
			supabase.removeChannel(channel)
		}
	}, [])

	async function loadDashboard() {
		const {
			data: { user }
		} = await supabase.auth.getUser()
		if (!user) {
			router.push('/auth/login')
			return
		}

		const { data: riderData } = await supabase
			.from('riders')
			.select('*')
			.eq('user_id', user.id)
			.single()

		if (!riderData) {
			router.push('/rider/onboarding')
			return
		}

		setRider(riderData)
		setIsOnline(riderData.operational_status === 'online')

		const { data: activeRows } = await supabase
			.from('orders')
			.select('*')
			.eq('rider_id', riderData.id)
			.in('status', ['assigned', 'picked_up', 'in_transit'])
			.order('updated_at', { ascending: false })
			.limit(1)

		setActiveJob(activeRows?.[0] ?? null)

		if (riderData.operational_status !== 'online') {
			setOffers([])
			setLoading(false)
			return
		}

		const { data: matchedRows } = await supabase
			.from('orders')
			.select('*')
			.eq('rider_id', riderData.id)
			.eq('status', 'matched')
			.order('updated_at', { ascending: false })
			.limit(10)

		const freshOffers = matchedRows || []
		const expiredOffers = freshOffers.filter(
			(offer) => getRemainingMs(offer.updated_at) === 0
		)

		if (expiredOffers.length) {
			await Promise.all(
				expiredOffers.map((offer) =>
					supabase
						.from('orders')
						.update({
							rider_id: null,
							rider_user_id: null,
							status: 'pending',
							locked: false
						})
						.eq('id', offer.id)
				)
			)
		}

		setOffers(
			freshOffers.filter((offer) => getRemainingMs(offer.updated_at) > 0)
		)
		setLoading(false)
	}

	async function toggleOnlineStatus() {
		if (!rider || rider.status !== 'approved') return
		const newStatus = isOnline ? 'offline' : 'online'

		await supabase
			.from('riders')
			.update({ operational_status: newStatus })
			.eq('id', rider.id)

		setIsOnline(!isOnline)
		loadDashboard()
	}

	async function acceptOffer(offer) {
		if (!rider) return
		if (getRemainingMs(offer.updated_at) === 0) {
			await declineOffer(offer)
			return
		}

		setAcceptingId(offer.id)
		const { error } = await supabase
			.from('orders')
			.update({ status: 'assigned' })
			.eq('id', offer.id)
			.eq('rider_id', rider.id)
			.eq('status', 'matched')

		if (!error) {
			router.push('/rider/active-job')
		} else {
			loadDashboard()
		}
		setAcceptingId(null)
	}

	async function declineOffer(offer) {
		if (!rider) return
		await supabase
			.from('orders')
			.update({
				rider_id: null,
				rider_user_id: null,
				status: 'pending',
				locked: false
			})
			.eq('id', offer.id)
			.eq('rider_id', rider.id)

		loadDashboard()
	}

	const availableOfferCount = offers.length

	const activeSummary = useMemo(() => {
		if (!activeJob) return null
		const label =
			activeJob.status === 'assigned'
				? 'Head to pickup'
				: activeJob.status === 'picked_up'
				? 'Pickup complete'
				: 'Delivering now'

		return { label }
	}, [activeJob])

	if (loading) {
		return (
			<div className='flex justify-center py-20'>
				<Loader2 className='animate-spin text-emerald-500' size={32} />
			</div>
		)
	}

	return (
		<div className='space-y-6 pb-24 pt-4'>
			<div className='bg-white/3 border border-white/10 rounded-[2.5rem] p-8'>
				<div className='flex items-start justify-between gap-6'>
					<div>
						<p className='text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500 mb-2'>
							Rider Workspace
						</p>
						<h2 className='text-2xl font-black text-white mb-1'>
							{rider?.full_name || 'Rider'}
						</h2>
						<p className='text-charcoal-400 text-sm font-medium'>
							Rating: ⭐ {rider?.rating || '5.0'}
						</p>
					</div>
					{rider?.status === 'approved' ? (
						<button
							onClick={toggleOnlineStatus}
							className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
								isOnline
									? 'bg-emerald-500 text-charcoal-950 shadow-[0_0_16px_rgba(16,185,129,0.4)]'
									: 'bg-charcoal-800 text-white border border-white/10'
							}`}>
							{isOnline ? 'Online' : 'Offline'}
						</button>
					) : (
						<div className='px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20'>
							Pending Approval
						</div>
					)}
				</div>
			</div>

			<button
				onClick={() => router.push('/rider/earnings')}
				className='w-full flex items-center justify-between px-6 py-4 bg-white/3 border border-white/10 rounded-2xl hover:bg-white/5 transition-all'>
				<div className='flex items-center gap-3 text-charcoal-300'>
					<DollarSign size={20} className='text-emerald-500' />
					<span className='font-bold text-sm'>View Earnings</span>
				</div>
				<ArrowRight size={16} className='text-charcoal-600' />
			</button>

			<div>
				<div className='flex items-center justify-between px-2 mb-4'>
					<h2 className='text-xs font-black text-charcoal-500 uppercase tracking-widest'>
						Matched Offers
					</h2>
					<div className='flex items-center gap-1.5 text-[10px] font-bold text-emerald-500'>
						<div className='w-1 h-1 bg-emerald-500 rounded-full animate-ping' />
						{availableOfferCount} Live
					</div>
				</div>

				{!isOnline ? (
					<div className='text-center py-12 bg-white/2 border border-white/5 rounded-2xl'>
						<p className='text-charcoal-500 font-bold text-sm'>
							Go online to receive match offers
						</p>
					</div>
				) : offers.length > 0 ? (
					<div className='space-y-4'>
						{offers.map((offer) => {
							const remainingMs = getRemainingMs(offer.updated_at)
							const expired = remainingMs === 0

							return (
								<div
									key={offer.id}
									className='bg-white/3 border border-white/10 rounded-2xl p-6'>
									<div className='flex justify-between items-start mb-4 gap-4'>
										<div className='flex-1'>
											<div className='flex items-center gap-2 mb-3'>
												<MapPin
													size={16}
													className='text-emerald-500'
												/>
												<div>
													<p className='text-xs text-charcoal-500 font-bold uppercase tracking-widest'>
														Pickup
													</p>
													<p className='font-black text-white text-sm'>
														{offer.pickup_name}
													</p>
												</div>
											</div>
											<div className='flex items-center gap-2'>
												<MapPin
													size={16}
													className='text-blue-500'
												/>
												<div>
													<p className='text-xs text-charcoal-500 font-bold uppercase tracking-widest'>
														Dropoff
													</p>
													<p className='font-black text-white text-sm'>
														{offer.dropoff_name}
													</p>
												</div>
											</div>
										</div>
										<div className='text-right shrink-0'>
											<p className='text-2xl font-black text-emerald-400'>
												₦
												{offer.agreed_price?.toLocaleString()}
											</p>
											<p className='text-charcoal-500 text-xs capitalize mt-1'>
												{offer.item_size || 'package'}
											</p>
										</div>
									</div>

									<div className='flex items-center justify-between mb-4 text-[10px] font-black uppercase tracking-widest'>
										<span className='text-charcoal-500 flex items-center gap-1.5'>
											<Clock size={12} />
											{expired
												? 'Offer expired'
												: `Expires in ${formatRemaining(
														remainingMs
												  )}`}
										</span>
										<span className='text-emerald-500'>
											Matched offer
										</span>
									</div>

									<div className='grid grid-cols-2 gap-3'>
										<button
											onClick={() => declineOffer(offer)}
											className='w-full bg-white/5 border border-white/10 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2'>
											<X size={16} />
											Decline
										</button>
										<button
											onClick={() => acceptOffer(offer)}
											disabled={acceptingId === offer.id}
											className='w-full bg-emerald-500 hover:bg-emerald-400 text-charcoal-950 font-black py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2'>
											{acceptingId === offer.id ? (
												<Loader2
													size={16}
													className='animate-spin'
												/>
											) : (
												<CheckCircle2 size={16} />
											)}
											Accept
										</button>
									</div>
								</div>
							)
						})}
					</div>
				) : (
					<div className='text-center py-12 bg-white/2 border border-white/5 rounded-2xl'>
						<Package
							size={32}
							className='mx-auto mb-4 text-charcoal-600'
						/>
						<p className='text-charcoal-500 font-bold text-sm'>
							No match offers right now
						</p>
						<p className='text-charcoal-600 text-xs mt-1'>
							Dispatch offers will appear here automatically
						</p>
					</div>
				)}
			</div>

			{activeJob && (
				<div className='bg-white/3 border border-white/10 rounded-2xl p-6'>
					<div className='flex items-center justify-between mb-3'>
						<div>
							<p className='text-[10px] font-black uppercase tracking-widest text-charcoal-500'>
								Active Job
							</p>
							<h3 className='text-lg font-black text-white'>
								{activeSummary?.label}
							</h3>
						</div>
						<button
							onClick={() => router.push('/rider/active-job')}
							className='text-xs font-black uppercase tracking-widest text-emerald-500'>
							Open
						</button>
					</div>
					<div className='text-sm text-charcoal-400'>
						{activeJob.pickup_name} → {activeJob.dropoff_name}
					</div>
				</div>
			)}
		</div>
	)
}
