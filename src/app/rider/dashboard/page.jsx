'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { MapPin, DollarSign, Package, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function RiderDashboard() {
	const router = useRouter()
	const supabase = createClient()
	const [rider, setRider] = useState(null)
	const [availableJobs, setAvailableJobs] = useState([])
	const [isOnline, setIsOnline] = useState(false)
	const [loading, setLoading] = useState(true)
	const [accepting, setAccepting] = useState(null) // orderId being accepted

	useEffect(() => {
		fetchRiderData()

		// Realtime: listen for new pending orders
		const channel = supabase
			.channel('available-jobs')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'orders',
					filter: 'status=eq.pending'
				},
				() => {
					fetchRiderData()
				}
			)
			.subscribe()

		return () => supabase.removeChannel(channel)
	}, [])

	async function fetchRiderData() {
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
			router.push('/driver/onboarding')
			return
		}

		setRider(riderData)
		setIsOnline(riderData?.operational_status === 'online')

		if (riderData.operational_status === 'online') {
			const { data: jobs } = await supabase
				.from('orders')
				.select('*')
				.eq('status', 'pending')
				.eq('vehicle_type', riderData.vehicle_type)
				.is('rider_id', null)
				.order('created_at', { ascending: false })
				.limit(10)
			setAvailableJobs(jobs || [])
		} else {
			setAvailableJobs([])
		}

		setLoading(false)
	}

	async function toggleOnlineStatus() {
		const newStatus = isOnline ? 'offline' : 'online'
		await supabase
			.from('riders')
			.update({ operational_status: newStatus })
			.eq('user_id', rider.user_id)
		setIsOnline(!isOnline)
		fetchRiderData()
	}

	async function acceptJob(jobId) {
		setAccepting(jobId)
		const { error } = await supabase
			.from('orders')
			.update({
				status: 'matched',
				rider_id: rider.user_id // use user_id, not riders.id
			})
			.eq('id', jobId)
			.eq('status', 'pending') // guard against race condition

		if (!error) {
			router.push('/rider/active-job')
		} else {
			// Job already taken — refresh list
			fetchRiderData()
		}
		setAccepting(null)
	}

	if (loading)
		return (
			<div className='flex justify-center py-20'>
				<Loader2 className='animate-spin text-emerald-500' size={32} />
			</div>
		)

	return (
		<div className='space-y-6 pb-24 pt-4'>
			{/* Status Card */}
			<div className='bg-white/3 border border-white/10 rounded-[2.5rem] p-8'>
				<div className='flex items-center justify-between'>
					<div>
						<h2 className='text-2xl font-black text-white mb-1'>
							{rider?.full_name}
						</h2>
						<p className='text-charcoal-400 text-sm font-medium'>
							Rating: ⭐ {rider?.rating || '5.0'}
						</p>
					</div>
					<button
						onClick={toggleOnlineStatus}
						className={`px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
							isOnline
								? 'bg-emerald-500 text-charcoal-950 shadow-[0_0_16px_rgba(16,185,129,0.4)]'
								: 'bg-charcoal-800 text-white border border-white/10'
						}`}>
						{isOnline ? '🟢 Online' : '⚫ Offline'}
					</button>
				</div>
			</div>

			{/* Earnings shortcut */}
			<button
				onClick={() => router.push('/rider/earnings')}
				className='w-full flex items-center justify-between px-6 py-4 bg-white/3 border border-white/10 rounded-2xl hover:bg-white/5 transition-all'>
				<div className='flex items-center gap-3 text-charcoal-300'>
					<DollarSign size={20} className='text-emerald-500' />
					<span className='font-bold text-sm'>View Earnings</span>
				</div>
				<span className='text-charcoal-600 text-xs font-black uppercase tracking-widest'>
					→
				</span>
			</button>

			{/* Available Jobs */}
			<div>
				<div className='flex items-center justify-between px-2 mb-4'>
					<h2 className='text-xs font-black text-charcoal-500 uppercase tracking-widest'>
						Available Jobs
					</h2>
					{isOnline && (
						<div className='flex items-center gap-1.5 text-[10px] font-bold text-emerald-500'>
							<div className='w-1 h-1 bg-emerald-500 rounded-full animate-ping' />
							LIVE
						</div>
					)}
				</div>

				{!isOnline ? (
					<div className='text-center py-12 bg-white/2 border border-white/5 rounded-2xl'>
						<p className='text-charcoal-500 font-bold text-sm'>
							Go online to see available jobs
						</p>
					</div>
				) : availableJobs.length > 0 ? (
					<div className='space-y-4'>
						{availableJobs.map((job) => (
							<div
								key={job.id}
								className='bg-white/3 border border-white/10 rounded-2xl p-6'>
								<div className='flex justify-between items-start mb-4'>
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
													{job.pickup_name}
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
													{job.dropoff_name}
												</p>
											</div>
										</div>
									</div>
									<div className='text-right ml-4'>
										<p className='text-2xl font-black text-emerald-400'>
											₦
											{job.agreed_price?.toLocaleString()}
										</p>
										<p className='text-charcoal-500 text-xs capitalize mt-1'>
											{job.item_size || 'package'}
										</p>
									</div>
								</div>
								<button
									onClick={() => acceptJob(job.id)}
									disabled={accepting === job.id}
									className='w-full bg-emerald-500 hover:bg-emerald-400 text-charcoal-950 font-black py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2'>
									{accepting === job.id ? (
										<Loader2
											size={16}
											className='animate-spin'
										/>
									) : (
										'Accept Job'
									)}
								</button>
							</div>
						))}
					</div>
				) : (
					<div className='text-center py-12 bg-white/2 border border-white/5 rounded-2xl'>
						<Package
							size={32}
							className='mx-auto mb-4 text-charcoal-600'
						/>
						<p className='text-charcoal-500 font-bold text-sm'>
							No jobs available right now
						</p>
						<p className='text-charcoal-600 text-xs mt-1'>
							New jobs will appear here automatically
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
