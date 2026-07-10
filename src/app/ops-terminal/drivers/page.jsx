import { validateAdmin } from '@/utils/admin'
import { createAdminClient } from '@/utils/supabase/admin'
import { getAllRiders } from '@/services/riders.service'
import { getSignedUrl } from '@/utils/supabase/storage'
import { redirect } from 'next/navigation'
import { FileText, ShieldCheck, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import DriverActions from './DriverActions'
import InviteDriverButton from './InviteDriverButton'

export const dynamic = 'force-dynamic'

export default async function AdminDriversPage() {
	try {
		await validateAdmin()
	} catch {
		redirect('/')
	}

	const adminSupabase = createAdminClient()
	const riders = await getAllRiders(adminSupabase)

	// Generate signed URLs for profile photos (documents bucket is private)
	// Each is wrapped individually so one failure doesn't crash the whole page
	const ridersWithPhotos = await Promise.all(
		riders.map(async (rider) => {
			let signedPhotoUrl = null
			try {
				signedPhotoUrl = await getSignedUrl(
					adminSupabase,
					rider.profile_photo_url
				)
			} catch (err) {
				console.error('[drivers] Failed to sign photo URL:', err)
			}
			return { ...rider, signedPhotoUrl }
		})
	)

	const pendingRiders = riders.filter((r) => r.status === 'pending')
	const approvedRiders = riders.filter((r) => r.status === 'approved')

	return (
		<div className='min-h-screen bg-black text-white p-8 font-mono'>
			<div className='flex justify-between items-end mb-12 border-b border-white/10 pb-8'>
				<div>
					<h1 className='text-3xl font-black italic tracking-tighter uppercase'>
						Registry / Drivers
					</h1>
					<p className='text-charcoal-500 text-xs mt-2 uppercase tracking-widest'>
						{pendingRiders.length} Pending Review ·{' '}
						{approvedRiders.length} Active Units
					</p>
				</div>
				<InviteDriverButton />
			</div>

			<div className='grid grid-cols-1 gap-4'>
				{ridersWithPhotos.length > 0 ? (
					ridersWithPhotos.map((rider) => (
						<Link
							key={rider.user_id}
							href={`/ops-terminal/drivers/${rider.user_id}`}>
							<div className='bg-charcoal-900/40 border border-white/5 rounded-2xl p-6 flex items-center gap-6 hover:border-emerald-500/20 transition-all cursor-pointer'>
								{/* Profile photo */}
								<div className='w-16 h-16 rounded-2xl bg-charcoal-800 shrink-0 overflow-hidden flex items-center justify-center text-xs font-black text-charcoal-500 border border-white/5'>
									{rider.signedPhotoUrl ? (
										<img
											src={rider.signedPhotoUrl}
											alt='Profile'
											className='w-full h-full object-cover'
										/>
									) : (
										<span>
											{rider.users?.name?.[0] ?? 'ND'}
										</span>
									)}
								</div>

								<div className='flex-1 min-w-0'>
									{/* Name + status badge */}
									<div className='flex items-center gap-2 mb-1'>
										<h3 className='text-base font-black truncate'>
											{rider.users?.name ||
												'Unnamed Rider'}
										</h3>
										{rider.status === 'approved' ? (
											<span className='shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'>
												<CheckCircle size={10} /> Active
											</span>
										) : (
											<span className='shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20'>
												<Clock size={10} /> Pending
											</span>
										)}
									</div>

									{/* Vehicle + plate */}
									<div className='flex items-center gap-3 text-charcoal-500 text-[10px] font-bold uppercase tracking-widest mb-2'>
										<span className='capitalize'>
											{rider.vehicle_type}
										</span>
										{rider.plate_number && (
											<>
												<span>·</span>
												<span>
													{rider.plate_number}
												</span>
											</>
										)}
									</div>

									{/* Document presence indicators */}
									<div className='flex gap-2'>
										{rider.id_card_url && (
											<span className='flex items-center gap-1 text-[9px] font-black uppercase text-emerald-500'>
												<ShieldCheck size={12} /> ID
											</span>
										)}
										{rider.license_url && (
											<span className='flex items-center gap-1 text-[9px] font-black uppercase text-blue-400'>
												<FileText size={12} /> License
											</span>
										)}
										{rider.vehicle_photo_url && (
											<span className='flex items-center gap-1 text-[9px] font-black uppercase text-charcoal-400'>
												<FileText size={12} /> Vehicle
											</span>
										)}
									</div>
								</div>

								{/* Actions — stopPropagation handled inside DriverActions */}
								<DriverActions
									riderId={rider.user_id}
									isApproved={rider.status === 'approved'}
								/>
							</div>
						</Link>
					))
				) : (
					<div className='text-center py-20 text-charcoal-600 text-xs font-black uppercase tracking-widest'>
						No drivers registered yet
					</div>
				)}
			</div>
		</div>
	)
}

