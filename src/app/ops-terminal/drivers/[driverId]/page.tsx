import { validateAdmin } from '@/utils/admin'
import { getRiderDocumentUrls } from '@/utils/supabase/storage'
import { createAdminClient } from '@/utils/supabase/admin'
import { getRiderWithUser } from '@/services/riders.service'
import { redirect, notFound } from 'next/navigation'
import {
	Star,
	Phone,
	FileText,
	ArrowLeft,
	Package
} from 'lucide-react'
import Link from 'next/link'
import DriverActions from '../DriverActions'

interface PageProps {
	params: Promise<{ driverId: string }>
}

function StatusBadge({ status }: { status: string }) {
	const config: Record<string, { label: string; classes: string }> = {
		approved: {
			label: 'Approved',
			classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
		},
		pending: {
			label: 'Pending Review',
			classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
		},
		rejected: {
			label: 'Rejected',
			classes: 'bg-red-500/10 text-red-400 border-red-500/20'
		},
		paused: {
			label: 'Suspended',
			classes: 'bg-red-500/10 text-red-400 border-red-500/20'
		}
	}
	const { label, classes } = config[status] ?? {
		label: status,
		classes: 'bg-white/5 text-charcoal-400 border-white/10'
	}
	return (
		<span
			className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${classes}`}>
			{label}
		</span>
	)
}

function DocumentCard({ label, url }: { label: string; url: string | null }) {
	return (
		<div className='bg-charcoal-900/40 border border-white/5 rounded-2xl p-5 flex items-center justify-between'>
			<div className='flex items-center gap-3'>
				<div className='w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center'>
					<FileText size={18} className='text-charcoal-400' />
				</div>
				<div>
					<div className='text-sm font-bold text-white'>{label}</div>
					<div
						className={`text-[10px] font-black uppercase tracking-widest ${
							url ? 'text-emerald-500' : 'text-red-500'
						}`}>
						{url ? 'Uploaded' : 'Missing'}
					</div>
				</div>
			</div>
			{url && (
				<a
					href={url}
					target='_blank'
					rel='noopener noreferrer'
					className='px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all'>
					View
				</a>
			)}
		</div>
	)
}

export default async function DriverDetailPage({
	params: paramsPromise
}: PageProps) {
	try {
		await validateAdmin()
	} catch {
		redirect('/')
	}

	const { driverId } = await paramsPromise
	const supabase = createAdminClient()

	const rider = await getRiderWithUser(supabase, driverId)
	if (!rider) notFound()

	const displayName = rider.users?.name || 'Unknown Driver'

	const { data: recentOrders } = await supabase
		.from('orders')
		.select(
			'id, status, agreed_price, created_at, pickup_name, dropoff_name'
		)
		.eq('rider_user_id', driverId)
		.order('created_at', { ascending: false })
		.limit(5)

	const completedOrders =
		recentOrders?.filter((o) => o.status === 'delivered') ?? []
	const totalEarned = completedOrders.reduce(
		(sum, o) => sum + (o.agreed_price ?? 0),
		0
	)

	const { idCard, license, vehiclePhoto } = await getRiderDocumentUrls(
		supabase,
		rider
	)

	return (
		<div className='min-h-screen bg-black text-white p-8 font-mono'>
			<div className='flex items-center gap-4 mb-10 border-b border-white/10 pb-8'>
				<Link
					href='/ops-terminal/drivers'
					className='w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors'>
					<ArrowLeft size={18} />
				</Link>
				<div className='flex-1'>
					<div className='text-[10px] text-charcoal-500 uppercase tracking-widest mb-1'>
						Registry / Drivers / Detail
					</div>
					<h1 className='text-3xl font-black italic tracking-tighter uppercase'>
						{displayName}
					</h1>
				</div>
				<div className='flex items-center gap-3'>
					<StatusBadge status={rider.status} />
					<DriverActions
						riderId={driverId}
						isApproved={rider.status === 'approved'}
					/>
				</div>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
				{/* Left column */}
				<div className='lg:col-span-1 space-y-6'>
					<div className='bg-charcoal-900/40 border border-white/5 rounded-3xl p-8'>
						<div className='flex flex-col items-center text-center mb-6'>
							<div className='w-24 h-24 rounded-3xl bg-charcoal-800 border border-white/10 overflow-hidden mb-4 flex items-center justify-center'>
								{rider.profile_photo_url ? (
									<img
										src={rider.profile_photo_url}
										alt='Profile'
										className='w-full h-full object-cover'
									/>
								) : (
									<span className='text-3xl font-black text-charcoal-600'>
										{displayName?.[0] ?? '?'}
									</span>
								)}
							</div>
							<h2 className='text-xl font-black tracking-tight'>
								{displayName}
							</h2>
							<div className='flex items-center gap-1 text-amber-400 mt-1'>
								<Star size={14} fill='currentColor' />
								<span className='text-sm font-black'>
									{rider.rating ?? '—'}
								</span>
							</div>
						</div>
						<div className='space-y-3 text-sm'>
							{rider.phone && (
								<div className='flex items-center gap-3 text-charcoal-400'>
									<Phone size={14} className='shrink-0' />
									<span>{rider.phone}</span>
								</div>
							)}
						</div>
					</div>

					<div className='grid grid-cols-2 gap-3'>
						<div className='bg-charcoal-900/40 border border-white/5 rounded-2xl p-5'>
							<div className='text-[9px] font-black text-charcoal-500 uppercase tracking-widest mb-1'>
								Completed
							</div>
							<div className='text-2xl font-black'>
								{completedOrders.length}
							</div>
						</div>
						<div className='bg-charcoal-900/40 border border-white/5 rounded-2xl p-5'>
							<div className='text-[9px] font-black text-charcoal-500 uppercase tracking-widest mb-1'>
								GMV
							</div>
							<div className='text-2xl font-black text-emerald-400'>
								₦{totalEarned.toLocaleString()}
							</div>
						</div>
					</div>
				</div>

				{/* Right column */}
				<div className='lg:col-span-2 space-y-8'>
					<div>
						<h2 className='text-xs font-black text-charcoal-500 uppercase tracking-[0.2em] mb-4'>
							Verification Documents
						</h2>
						<div className='space-y-3'>
							<DocumentCard
								label='Government ID Card'
								url={idCard}
							/>
							<DocumentCard
								label="Driver's License"
								url={license}
							/>
							<DocumentCard
								label='Vehicle Photo'
								url={vehiclePhoto}
							/>
						</div>
					</div>

					<div>
						<h2 className='text-xs font-black text-charcoal-500 uppercase tracking-[0.2em] mb-4'>
							Recent Deliveries
						</h2>
						{recentOrders && recentOrders.length > 0 ? (
							<div className='space-y-3'>
								{recentOrders.map((order) => (
									<div
										key={order.id}
										className='bg-charcoal-900/40 border border-white/5 rounded-2xl p-5 flex items-center justify-between'>
										<div className='flex items-center gap-4'>
											<div className='w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center'>
												<Package
													size={16}
													className='text-charcoal-400'
												/>
											</div>
											<div>
												<div className='text-sm font-bold text-white truncate max-w-50'>
													{order.dropoff_name}
												</div>
												<div className='text-[10px] text-charcoal-500 font-bold uppercase tracking-widest'>
													{new Date(
														order.created_at
													).toLocaleDateString()}
												</div>
											</div>
										</div>
										<div className='text-right'>
											<div className='text-sm font-black text-white'>
												₦
												{order.agreed_price?.toLocaleString() ??
													'—'}
											</div>
											<span
												className={`text-[8px] font-black uppercase tracking-widest ${
													order.status === 'delivered'
														? 'text-emerald-400'
														: order.status ===
														  'cancelled'
														? 'text-red-400'
														: 'text-amber-400'
												}`}>
												{order.status}
											</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className='bg-charcoal-900/40 border border-white/5 rounded-2xl p-10 text-center'>
								<Package
									size={28}
									className='mx-auto mb-3 text-charcoal-700'
								/>
								<p className='text-[10px] font-black text-charcoal-600 uppercase tracking-widest'>
									No deliveries yet
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
