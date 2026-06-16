'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
	ArrowLeft,
	Wallet,
	TrendingUp,
	History,
	ArrowUpRight,
	Download,
	Loader2,
	Sparkles,
	Receipt
} from 'lucide-react'
import { PRICING } from '@/utils/constants'

export default function RiderEarnings() {
	const router = useRouter()
	const supabase = createClient()
	const [profile, setProfile] = useState(null)
	const [totalEarnings, setTotalEarnings] = useState(0)
	const [transactions, setTransactions] = useState([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		async function fetchData() {
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) {
				router.push('/auth/login')
				return
			}

			// Fetch Rider Profile
			const { data: rider } = await supabase
				.from('riders')
				.select('*')
				.eq('user_id', user.id)
				.single()
			setProfile(rider)

			// Fetch completed orders
			const { data: orders, error } = await supabase
				.from('orders')
				.select('*')
				.eq('rider_id', rider.id)
				.eq('status', 'delivered')
				.order('created_at', { ascending: false })

			if (orders) {
				const total =
					orders.reduce((sum, o) => sum + (o.agreed_price || 0), 0) *
					(1 - PRICING.PLATFORM_COMMISSION)
				setTotalEarnings(Math.floor(total))
				setTransactions(orders.slice(0, 5))
			}
			setLoading(false)
		}
		fetchData()
	}, [supabase, router])

	if (loading)
		return (
			<div className='flex justify-center py-20'>
				<Loader2 className='animate-spin text-emerald-500' />
			</div>
		)

	return (
		<div className='space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-4'>
					<button
						onClick={() => router.back()}
						className='w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 hover:bg-white/10 transition-colors'>
						<ArrowLeft size={20} />
					</button>
					<div>
						<h1 className='text-3xl font-black text-white tracking-tight font-outfit italic'>
							Financial{' '}
							<span className='text-emerald-500'>Node</span>
						</h1>
						<p className='text-charcoal-400 text-sm font-medium'>
							Operation settlement & payouts.
						</p>
					</div>
				</div>
				<button className='w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-500/20'>
					<Download size={20} />
				</button>
			</div>

			{/* Wallet Visualization */}
			<div className='bg-white/3 border border-white/10 rounded-[3rem] p-10 relative overflow-hidden group shadow-2xl'>
				<div className='absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-emerald-500/20 transition-all duration-1000'></div>
				<div className='relative z-10'>
					<div className='flex items-center gap-3 mb-6'>
						<div className='w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-charcoal-950 shadow-glow'>
							<Wallet size={20} strokeWidth={3} />
						</div>
						<span className='text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 font-outfit italic'>
							Total Earnings
						</span>
					</div>

					<div className='mb-10'>
						<span className='text-2xl font-black text-emerald-500 mr-2 italic'>
							₦
						</span>
						<span className='text-7xl font-black text-white tracking-tighter italic font-outfit leading-none'>
							{totalEarnings.toLocaleString()}
						</span>
					</div>

					<p className='text-charcoal-500 text-[10px] font-bold uppercase tracking-widest mb-8'>
						Across {transactions.length > 0 ? 'all' : '0'} completed
						deliveries, net of platform commission.
					</p>

					<button className='w-full py-6 bg-emerald-500 hover:bg-emerald-400 text-charcoal-950 rounded-4xl font-black text-lg uppercase tracking-widest transition-all shadow-glow active:scale-95 flex items-center justify-center gap-3'>
						Withdraw Funds{' '}
						<ArrowUpRight size={20} strokeWidth={3} />
					</button>
				</div>
			</div>

			{/* Analytics Section */}
			<div className='space-y-4'>
				<div className='flex items-center justify-between px-2'>
					<h2 className='text-xs font-black text-charcoal-500 uppercase tracking-widest italic'>
						Signal Registry
					</h2>
					<button className='text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1'>
						Historical Data <History size={12} />
					</button>
				</div>

				<div className='space-y-3'>
					{transactions.map((tx, i) => (
						<div
							key={tx.id}
							className='bg-white/3 p-5 rounded-4xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-all group'>
							<div className='flex items-center gap-4'>
								<div className='w-12 h-12 bg-charcoal-900 rounded-2xl flex items-center justify-center text-emerald-500 border border-white/5 group-hover:border-emerald-500/30 transition-all font-outfit font-black italic'>
									<Receipt size={20} />
								</div>
								<div>
									<div className='text-sm font-black text-white uppercase tracking-tight'>
										Mission Settlement
									</div>
									<div className='text-[10px] font-bold text-charcoal-500 uppercase tracking-widest'>
										{new Date(
											tx.created_at
										).toLocaleDateString()}{' '}
										• ID: {tx.id.slice(0, 6)}
									</div>
								</div>
							</div>
							<div className='text-right'>
								<div className='text-xl font-black text-white italic tracking-tighter mb-1'>
									+₦
									{Math.floor(
										tx.agreed_price *
											(1 - PRICING.PLATFORM_COMMISSION)
									).toLocaleString()}
								</div>
								<div className='text-[9px] font-black text-emerald-500 uppercase tracking-widest italic flex items-center justify-end gap-1'>
									Cleared <Sparkles size={10} />
								</div>
							</div>
						</div>
					))}

					{transactions.length === 0 && (
						<div className='py-16 text-center border border-dashed border-white/10 rounded-[3rem] opacity-30'>
							<div className='w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4'>
								<TrendingUp size={24} />
							</div>
							<p className='text-[10px] font-black uppercase tracking-[0.4em]'>
								Zero Movement Detected
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
