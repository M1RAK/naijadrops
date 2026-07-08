import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import RiderHeartbeat from '@/components/driver/RiderHeartbeat'
import { Clock, ShieldAlert, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default async function RiderWorkspaceLayout({ children }) {
	let supabase
	try {
		supabase = await createClient()
	} catch {
		redirect('/auth/login')
	}

	const {
		data: { user }
	} = await supabase.auth.getUser()
	if (!user) redirect('/auth/login')

	const { data: rider } = await supabase
		.from('riders')
		.select('id, status, operational_status, rejection_reason')
		.eq('user_id', user.id)
		.single()

	// Safe now — /rider/onboarding is outside this layout's subtree
	if (!rider) redirect('/rider/onboarding')

	const isApproved = rider.status === 'approved'
	const isPending = rider.status === 'pending'
	const isRejected = rider.status === 'rejected'
	const isPaused = rider.status === 'paused'
	const isOnline = rider.operational_status === 'online'

	return (
		<div className='flex flex-col min-h-dvh bg-charcoal-950 text-white selection:bg-emerald-500 overflow-x-hidden'>
			<nav className='border-b border-white/5 px-6 pt-12 pb-4 flex justify-between items-center bg-charcoal-950/80 backdrop-blur-xl z-50 sticky top-0'>
				<div className='font-outfit font-black text-xl italic tracking-tighter'>
					NaijaDrops <span className='text-emerald-500'>Rider</span>
				</div>
				<div className='flex gap-4 text-[10px] font-black uppercase tracking-widest text-charcoal-500'>
					{isApproved && (
						<>
							<a
								href='/rider/dashboard'
								className='hover:text-emerald-400'>
								Dashboard
							</a>
							<Link
								href='/rider/active-job'
								className='hover:text-emerald-400'>
								Active
							</Link>
							<Link
								href='/rider/earnings'
								className='hover:text-emerald-400'>
								Money
							</Link>
							<Link
								href='/rider/profile'
								className='hover:text-emerald-400'>
								Account
							</Link>
						</>
					)}
				</div>
			</nav>

			<main className='flex-1 w-full max-w-lg mx-auto relative px-5 py-4'>
				{isPending && (
					<div className='fixed top-20 inset-x-0 z-100 flex justify-center pointer-events-none'>
						<div className='bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md px-6 py-3 rounded-full text-emerald-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-glow'>
							<Clock className='animate-pulse' size={14} />
							View Only — Verification Pending
						</div>
					</div>
				)}

				{(isRejected || isPaused) && (
					<div className='fixed inset-0 z-100 bg-charcoal-950 flex flex-col items-center justify-center p-8 text-center'>
						<div className='w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-8'>
							<ShieldAlert className='text-red-500' size={36} />
						</div>
						<h2 className='text-2xl font-black text-white mb-2'>
							{isRejected ? 'Access Denied' : 'Account Paused'}
						</h2>
						<p className='text-red-400/80 text-xs font-black uppercase tracking-widest mb-6'>
							Status: {rider.status}
						</p>
						<div className='bg-red-500/5 border border-red-500/20 rounded-2xl p-5 mb-8 w-full'>
							<div className='flex items-start gap-3 text-left'>
								<AlertTriangle
									className='text-red-400 shrink-0 mt-0.5'
									size={16}
								/>
								<div>
									<div className='text-white text-sm font-bold mb-1'>
										Reason for restriction:
									</div>
									<p className='text-charcoal-400 text-xs leading-relaxed'>
										{rider.rejection_reason ||
											'Your profile requires further verification or violated terms of service. Please contact our Kano operations center.'}
									</p>
								</div>
							</div>
						</div>
						<a
							href='/auth/login'
							className='w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black text-sm block text-center'>
							Sign Out
						</a>
					</div>
				)}

				{!isRejected && !isPaused && children}
				{/* Silently writes GPS position + last_seen_at every 35s.
			    Only active when the rider is approved and online. */}
				{isApproved && (
					<RiderHeartbeat riderId={rider.id} isOnline={isOnline} />
				)}
			</main>
		</div>
	)
}
