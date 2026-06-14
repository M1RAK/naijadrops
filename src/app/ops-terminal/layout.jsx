import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { validateAdmin } from '@/utils/admin'
import { Users, Package, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

export default async function OpsTerminalLayout({ children }) {
	let supabase
	let user

	try {
		supabase = await createClient()
		const {
			data: { user: authUser }
		} = await supabase.auth.getUser()
		user = authUser
	} catch {
		redirect('/auth/login')
	}

	if (!user) redirect('/auth/login')

	try {
		await validateAdmin()
	} catch {
		redirect('/')
	}

	return (
		<div className='flex h-screen bg-charcoal-950 text-white overflow-hidden selection:bg-emerald-500'>
			{/* Sidebar */}
			<aside className='w-72 border-r border-white/5 bg-charcoal-900/50 flex flex-col backdrop-blur-md relative z-20'>
				<div className='p-8 border-b border-white/5 relative'>
					<div className='absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none' />
					<div className='font-outfit font-black text-3xl italic tracking-tighter uppercase mb-1'>
						Ops<span className='text-emerald-500'>Terminal</span>
					</div>
					<div className='flex items-center gap-2 mt-4 text-emerald-500 text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20'>
						<span className='inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse mr-2' />
						System Online
					</div>
				</div>

				<div className='flex-1 overflow-y-auto px-4 py-8 space-y-8'>
					<div>
						<div className='text-[10px] font-black text-charcoal-600 uppercase tracking-[0.3em] mb-4 px-4'>
							Visibility
						</div>
						<nav className='space-y-1'>
							<Link
								href='/ops-terminal/dashboard'
								className='flex items-center gap-3 p-4 rounded-2xl hover:bg-white/5 hover:text-white text-charcoal-400 font-bold transition-all text-sm group'>
								<LayoutDashboard
									size={18}
									className='group-hover:text-emerald-500 transition-colors'
								/>
								<span>Overview</span>
							</Link>

							<Link
								href='/ops-terminal/orders'
								className='flex items-center gap-3 p-4 rounded-2xl hover:bg-white/5 hover:text-white text-charcoal-400 font-bold transition-all text-sm group'>
								<Package
									size={18}
									className='group-hover:text-emerald-500 transition-colors'
								/>
								<span>Live Orders</span>
							</Link>
						</nav>
					</div>

					<div>
						<div className='text-[10px] font-black text-charcoal-600 uppercase tracking-[0.3em] mb-4 px-4'>
							Operations
						</div>
						<nav className='space-y-1'>
							<Link
								href='/ops-terminal/drivers'
								className='flex items-center gap-3 p-4 rounded-2xl hover:bg-white/5 hover:text-white text-charcoal-400 font-bold transition-all text-sm group'>
								<Users
									size={18}
									className='group-hover:text-emerald-500 transition-colors'
								/>
								<span>Drivers</span>
							</Link>
						</nav>
					</div>
				</div>

				<div className='p-6 border-t border-white/5 bg-black/40'>
					<div className='text-[10px] text-charcoal-500 font-mono tracking-widest uppercase mb-1'>
						Admin
					</div>
					<div className='text-white text-xs font-bold truncate'>
						{user?.email}
					</div>
					<form
						action='/api/auth/signout'
						method='POST'
						className='mt-4'>
						<button
							type='submit'
							className='text-red-500 text-[10px] font-black uppercase tracking-widest hover:underline'>
							Sign Out
						</button>
					</form>
				</div>
			</aside>

			<main className='flex-1 overflow-y-auto relative z-10 bg-black'>
				<div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 pointer-events-none mix-blend-overlay" />
				{children}
			</main>
		</div>
	)
}
