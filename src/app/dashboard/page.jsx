'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
	Package,
	Loader2,
	ShieldCheck,
	LogOut,
	User as UserIcon,
	Menu,
	X,
	Phone,
	History as HistoryIcon,
	Camera
} from 'lucide-react'
import Map, { Marker } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { ensureVendorProfile } from '@/services/vendors.service'

const KANO_CENTER = { lat: 12.0022, lng: 8.592 }

// ─── Profile Modal ────────────────────────────────────────────────────────────

function ProfileModal({ isOpen, onClose, onSave, currentName, currentAvatar }) {
	const [name, setName] = useState(currentName || '')
	const [avatar, setAvatar] = useState(currentAvatar || '')
	const [uploading, setUploading] = useState(false)
	const [loading, setLoading] = useState(false)
	const supabase = createClient()

	useEffect(() => {
		if (isOpen) {
			setName(currentName || '')
			setAvatar(currentAvatar || '')
			setLoading(false)
		}
	}, [isOpen, currentName, currentAvatar])

	const handleImageUpload = async (e) => {
		const file = e.target.files[0]
		if (!file) return
		setUploading(true)
		try {
			const {
				data: { user }
			} = await supabase.auth.getUser()
			const fileExt = file.name.split('.').pop()
			const fileName = `${user.id}/${Math.random()}.${fileExt}`
			const { error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(fileName, file)
			if (uploadError) throw uploadError
			const {
				data: { publicUrl }
			} = supabase.storage.from('avatars').getPublicUrl(fileName)
			setAvatar(publicUrl)
		} catch (error) {
			alert('Error uploading image: ' + error.message)
		} finally {
			setUploading(false)
		}
	}

	if (!isOpen) return null

	return (
		<div className='fixed inset-0 z-120 flex items-center justify-center p-6'>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className='absolute inset-0 bg-charcoal-950/90 backdrop-blur-md'
				onClick={onClose}
			/>
			<motion.div
				initial={{ scale: 0.9, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				className='relative w-full max-w-sm bg-charcoal-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6'>
				<div className='text-center'>
					<h2 className='text-2xl font-black text-white italic uppercase tracking-tighter font-outfit'>
						Your Profile
					</h2>
					<p className='text-charcoal-500 text-xs mt-2 uppercase font-bold tracking-widest'>
						Help riders find you faster
					</p>
				</div>

				<div className='flex flex-col items-center gap-4'>
					<div className='relative group'>
						<div className='w-24 h-24 rounded-full bg-charcoal-950 border-2 border-white/10 overflow-hidden flex items-center justify-center shadow-2xl'>
							{avatar ? (
								<img
									src={avatar}
									alt='Profile'
									className='w-full h-full object-cover'
								/>
							) : (
								<UserIcon
									size={40}
									className='text-charcoal-800'
								/>
							)}
							{uploading && (
								<div className='absolute inset-0 bg-charcoal-950/60 flex items-center justify-center'>
									<Loader2 className='animate-spin text-emerald-500' />
								</div>
							)}
						</div>
						<label className='absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-400 transition-all shadow-lg'>
							<Camera size={16} className='text-charcoal-950' />
							<input
								type='file'
								accept='image/*'
								className='hidden'
								onChange={handleImageUpload}
								disabled={uploading}
							/>
						</label>
					</div>
				</div>

				<div className='space-y-4'>
					<div>
						<label className='text-[10px] font-black text-charcoal-600 uppercase tracking-widest block mb-2 px-1'>
							Full Name
						</label>
						<input
							type='text'
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder='Enter your name'
							className='w-full bg-charcoal-950 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:border-emerald-500 transition-all outline-none'
						/>
					</div>
					<button
						onClick={async () => {
							setLoading(true)
							try {
								await onSave(name, avatar)
							} finally {
								setLoading(false)
							}
						}}
						disabled={loading || uploading || !name}
						className='w-full bg-emerald-500 hover:bg-emerald-400 text-charcoal-950 font-black py-4 rounded-2xl uppercase text-xs tracking-widest shadow-glow disabled:opacity-50'>
						{loading ? (
							<Loader2
								className='animate-spin mx-auto'
								size={18}
							/>
						) : (
							'Save Profile'
						)}
					</button>
				</div>
			</motion.div>
		</div>
	)
}

// ─── Menu Modal ───────────────────────────────────────────────────────────────

function MenuModal({ isOpen, onClose, onLogout, onProfile, userAvatar }) {
	const router = useRouter()
	if (!isOpen) return null

	return (
		<div className='fixed inset-0 z-110 flex items-start justify-end p-6'>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className='absolute inset-0 bg-charcoal-950/60 backdrop-blur-sm'
				onClick={onClose}
			/>
			<motion.div
				initial={{ x: 100, opacity: 0 }}
				animate={{ x: 0, opacity: 1 }}
				exit={{ x: 100, opacity: 0 }}
				className='relative w-72 bg-charcoal-900 border border-white/10 rounded-4xl shadow-2xl overflow-hidden flex flex-col mt-20'>
				<div className='p-5 border-b border-white/5 flex items-center justify-between'>
					<span className='text-[10px] font-black text-charcoal-500 uppercase tracking-widest'>
						Menu
					</span>
					<button
						onClick={onClose}
						className='p-2 text-charcoal-500 hover:text-white transition-colors'>
						<X size={18} />
					</button>
				</div>

				<div className='p-4 space-y-1'>
					<button
						onClick={() => {
							onProfile()
							onClose()
						}}
						className='w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 text-white transition-all group'>
						<div className='w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-charcoal-950 transition-all overflow-hidden'>
							{userAvatar ? (
								<img
									src={userAvatar}
									className='w-full h-full object-cover'
									alt=''
								/>
							) : (
								<UserIcon size={18} />
							)}
						</div>
						<span className='font-bold text-sm'>Profile</span>
					</button>

					<button
						onClick={() => {
							router.push('/vendor/history')
							onClose()
						}}
						className='w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 text-white transition-all group'>
						<div className='w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-charcoal-950 transition-all'>
							<HistoryIcon size={18} />
						</div>
						<span className='font-bold text-sm'>Order History</span>
					</button>

					{/* Become a Rider — separate onboarding flow, not a role switch */}
					<button
						onClick={() => {
							router.push('/rider/onboarding')
							onClose()
						}}
						className='w-full flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 text-emerald-500 transition-all group text-left'>
						<div className='w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-charcoal-950 transition-all'>
							<ShieldCheck size={18} />
						</div>
						<div>
							<div className='font-black text-sm uppercase tracking-tight'>
								Become a Rider
							</div>
							<div className='text-[9px] font-bold opacity-60 uppercase tracking-widest'>
								Verify & Earn
							</div>
						</div>
					</button>

					<div className='h-px bg-white/5 my-2' />

					<a
						href='https://wa.me/2349118267433'
						target='_blank'
						className='w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-emerald-500/10 text-emerald-400 transition-all'>
						<div className='w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center'>
							<Phone size={18} />
						</div>
						<div className='text-left'>
							<div className='font-bold text-sm'>
								WhatsApp Support
							</div>
							<div className='text-[10px] opacity-60'>
								09118267433
							</div>
						</div>
					</a>

					<div className='h-px bg-white/5 my-2' />

					<button
						onClick={onLogout}
						className='w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-500/10 text-charcoal-400 hover:text-red-400 transition-all group'>
						<div className='w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all'>
							<LogOut size={18} />
						</div>
						<span className='font-bold text-sm'>Sign Out</span>
					</button>
				</div>
			</motion.div>
		</div>
	)
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
	const router = useRouter()
	const supabase = createClient()
	const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

	const [user, setUser] = useState(null)
	const [activeOrderCount, setActiveOrderCount] = useState(0)
	const [userLocation, setUserLocation] = useState(KANO_CENTER)
	const [mapLoaded, setMapLoaded] = useState(false)
	const [greeting, setGreeting] = useState('Good day')
	const [displayName, setDisplayName] = useState('')
	const [avatarUrl, setAvatarUrl] = useState('')
	const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
	const [isMenuOpen, setIsMenuOpen] = useState(false)

	useEffect(() => {
		const h = new Date().getHours()
		if (h < 12) setGreeting('Good morning')
		else if (h < 17) setGreeting('Good afternoon')
		else setGreeting('Good evening')
	}, [])

	async function loadData() {
		const {
			data: { user: u }
		} = await supabase.auth.getUser()
		if (!u) return
		setUser(u)

		// users row is guaranteed by the DB trigger at signup — just read it
		const { data: profile } = await supabase
			.from('users')
			.select('name, avatar_url')
			.eq('id', u.id)
			.single()

		if (profile?.name) {
			setDisplayName(profile.name.split(' ')[0])
			setAvatarUrl(profile.avatar_url || '')
		} else {
			// No name set yet — open profile modal to collect it
			setIsProfileModalOpen(true)
		}

		// vendors row is also guaranteed by the trigger
		const vendorProfile = await ensureVendorProfile(supabase, u.id)
		if (!vendorProfile) return

		const ACTIVE_STATUSES = [
			'pending',
			'matched',
			'assigned',
			'picked_up',
			'in_transit'
		]

		const { data: orders } = await supabase
			.from('orders')
			.select('id, status')
			.eq('vendor_id', vendorProfile.id)
			.in('status', ACTIVE_STATUSES)
			.order('created_at', { ascending: false })
			.limit(5)

		setActiveOrderCount(orders?.length ?? 0)
	}

	useEffect(() => {
		loadData()

		if (typeof navigator !== 'undefined' && navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(pos) =>
					setUserLocation({
						lat: pos.coords.latitude,
						lng: pos.coords.longitude
					}),
				() => {}
			)
		}
	}, [])

	const handleUpdateProfile = async (name, avatar) => {
		const { error } = await supabase
			.from('users')
			.update({ name, avatar_url: avatar })
			.eq('id', user.id)
		if (!error) {
			setIsProfileModalOpen(false)
			loadData()
		}
	}

	const handleLogout = async () => {
		await supabase.auth.signOut()
		router.replace('/auth/login')
	}

	return (
		<div className='h-dvh w-full relative overflow-hidden bg-charcoal-950'>
			<ProfileModal
				isOpen={isProfileModalOpen}
				onClose={() => setIsProfileModalOpen(false)}
				onSave={handleUpdateProfile}
				currentName={displayName}
				currentAvatar={avatarUrl}
			/>

			<AnimatePresence>
				{isMenuOpen && (
					<MenuModal
						isOpen={isMenuOpen}
						onClose={() => setIsMenuOpen(false)}
						onLogout={handleLogout}
						onProfile={() => setIsProfileModalOpen(true)}
						userAvatar={avatarUrl}
					/>
				)}
			</AnimatePresence>

			{/* Full-screen Map */}
			<div className='absolute inset-0 z-0'>
				{mapboxToken ? (
					<Map
						mapboxAccessToken={mapboxToken}
						initialViewState={{
							longitude: userLocation.lng,
							latitude: userLocation.lat,
							zoom: 13
						}}
						style={{ width: '100%', height: '100%' }}
						mapStyle='mapbox://styles/mapbox/dark-v11'
						onLoad={() => setMapLoaded(true)}>
						<Marker
							longitude={userLocation.lng}
							latitude={userLocation.lat}
							anchor='center'>
							<div className='relative'>
								<div className='w-5 h-5 bg-emerald-500 rounded-full border-4 border-white shadow-[0_0_16px_rgba(16,185,129,0.8)]' />
								<div className='absolute inset-0 w-5 h-5 bg-emerald-400 rounded-full animate-ping opacity-40' />
							</div>
						</Marker>
					</Map>
				) : (
					<div className='w-full h-full bg-charcoal-900 flex items-center justify-center'>
						<div className='text-charcoal-600 text-sm font-medium'>
							Map loading…
						</div>
					</div>
				)}
			</div>

			{/* Top gradient */}
			<div className='absolute inset-x-0 top-0 h-32 bg-linear-to-b from-charcoal-950/80 to-transparent z-10 pointer-events-none' />

			{/* Top Bar */}
			<div className='absolute top-0 inset-x-0 z-20 px-6 pt-14 pb-4'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-3'>
						<div className='w-12 h-12 rounded-2xl bg-charcoal-900 border border-white/10 overflow-hidden flex items-center justify-center shadow-xl'>
							{avatarUrl ? (
								<img
									src={avatarUrl}
									className='w-full h-full object-cover'
									alt=''
								/>
							) : (
								<UserIcon
									className='text-charcoal-600'
									size={20}
								/>
							)}
						</div>
						<div>
							<p className='text-charcoal-400 text-[10px] font-bold uppercase tracking-widest leading-none mb-1'>
								{greeting}
							</p>
							<h1 className='text-white font-black text-xl tracking-tight font-outfit leading-none'>
								{displayName || 'Dashboard'}
							</h1>
						</div>
					</div>

					<div className='flex items-center gap-3'>
						{activeOrderCount > 0 && (
							<div className='bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 rounded-full flex items-center gap-1.5'>
								<div className='w-2 h-2 bg-emerald-400 rounded-full animate-pulse' />
								<span className='text-emerald-400 text-[10px] font-black uppercase tracking-widest'>
									{activeOrderCount} Active
								</span>
							</div>
						)}
						<button
							onClick={() => setIsMenuOpen(true)}
							className='w-12 h-12 bg-charcoal-900 border border-white/10 rounded-2xl text-white flex items-center justify-center hover:bg-white/5 transition-all shadow-xl'>
							<Menu size={20} />
						</button>
					</div>
				</div>
			</div>

			{/* Bottom Sheet CTA */}
			<div className='absolute bottom-0 inset-x-0 z-20'>
				<div className='absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-charcoal-950 via-charcoal-950/95 to-transparent pointer-events-none' />
				<div className='relative px-5 pb-8 pt-6'>
					<motion.button
						whileTap={{ scale: 0.97 }}
						onClick={() => router.push('/send-package/step-1')}
						className='w-full bg-emerald-500 hover:bg-emerald-400 text-charcoal-950 font-black py-6 rounded-3xl flex items-center justify-center gap-3 text-xl uppercase tracking-wider shadow-[0_0_32px_rgba(16,185,129,0.4)] transition-all'>
						<Package size={24} strokeWidth={2.5} />
						Send Package
					</motion.button>
				</div>
			</div>

			{/* Pilot zone label */}
			{mapLoaded && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 1.2 }}
					className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none'>
					<div className='bg-charcoal-950/60 backdrop-blur-sm border border-emerald-500/20 rounded-full px-4 py-1.5'>
						<span className='text-emerald-400 text-[10px] font-black uppercase tracking-widest'>
							Kano Pilot Zone Active
						</span>
					</div>
				</motion.div>
			)}
		</div>
	)
}
