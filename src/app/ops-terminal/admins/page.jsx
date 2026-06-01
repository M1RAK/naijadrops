import { validateAdmin } from '@/utils/admin'
import { createClient } from '@/utils/supabase/server'
import { ShieldCheck, Mail } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminsPage() {
	const { admin: currentAdmin } = await validateAdmin()
	const supabase = await createClient()

	const isSuperAdmin = currentAdmin?.is_super_admin === true

	const { data: admins } = await supabase
		.from('admin_users')
		.select('*')
		.order('email')

	return (
		<div className='min-h-screen bg-black text-white p-8 font-mono'>
			<div className='flex justify-between items-end mb-12 border-b border-white/10 pb-8'>
				<div>
					<h1 className='text-3xl font-black italic tracking-tighter uppercase'>
						Registry / Administrators
					</h1>
					<p className='text-charcoal-500 text-xs mt-2 uppercase tracking-widest'>
						Security Clearance:{' '}
						{isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}
					</p>
				</div>
			</div>

			<section className='max-w-2xl'>
				<h2 className='text-sm font-black uppercase tracking-[0.2em] text-emerald-500 mb-6 flex items-center gap-2'>
					<ShieldCheck size={16} /> Active Credentials
				</h2>
				<div className='space-y-4'>
					{admins?.map((a) => (
						<div
							key={a.id || a.email}
							className='bg-charcoal-900/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between'>
							<div className='flex items-center gap-4'>
								<div className='w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-charcoal-500'>
									<Mail size={18} />
								</div>
								<div>
									<div className='text-sm font-bold tracking-tight'>
										{a.email}
									</div>
									<div className='text-[9px] font-black uppercase tracking-widest text-charcoal-600'>
										{a.is_super_admin
											? 'SUPER ADMIN'
											: 'ADMIN'}
									</div>
								</div>
							</div>
							<div
								className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
									a.is_active
										? 'bg-emerald-500/10 text-emerald-500'
										: 'bg-rose-500/10 text-rose-500'
								}`}>
								{a.is_active ? 'Active' : 'Inactive'}
							</div>
						</div>
					))}

					{(!admins || admins.length === 0) && (
						<div className='text-center py-10 text-charcoal-600 text-xs font-black uppercase tracking-widest'>
							No admin records found.
						</div>
					)}
				</div>

				{!isSuperAdmin && (
					<p className='mt-8 text-charcoal-600 text-[10px] font-black uppercase tracking-[0.2em]'>
						Super Admin privileges required to manage credentials.
					</p>
				)}
			</section>
		</div>
	)
}
