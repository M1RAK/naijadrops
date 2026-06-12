'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import imageCompression from 'browser-image-compression'
import {
	ArrowLeft,
	Camera,
	Loader2,
	CheckCircle2,
	AlertCircle,
	Upload,
	ShieldCheck,
	Truck,
	User
} from 'lucide-react'

const STEPS = [
	{ id: 1, title: 'Identity', icon: User },
	{ id: 2, title: 'Vehicle', icon: Truck },
	{ id: 3, title: 'Verification', icon: ShieldCheck }
]

export default function RiderOnboardingPage() {
	const router = useRouter()
	const supabase = createClient()

	const [step, setStep] = useState(1)
	const [loading, setLoading] = useState(false)
	const [pageLoading, setPageLoading] = useState(true)
	const [error, setError] = useState(null)
	const [existingStatus, setExistingStatus] = useState(null)
	const [uploadStats, setUploadStats] = useState({})
	const [formData, setFormData] = useState({
		full_name: '',
		phone: '',
		vehicle_type: 'bike',
		plate_number: '',
		id_card_url: '',
		license_url: '',
		vehicle_photo_url: '',
		profile_photo_url: ''
	})

	useEffect(() => {
		async function loadData() {
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) {
				router.replace('/auth/login')
				return
			}

			const { data: rider } = await supabase
				.from('riders')
				.select('*')
				.eq('user_id', user.id)
				.maybeSingle()

			if (rider) {
				setFormData((prev) => ({ ...prev, ...rider }))
				setExistingStatus(rider.status)
			}

			setPageLoading(false)
		}

		loadData()
	}, [router, supabase])

	const handleInputChange = (event) => {
		const { name, value } = event.target
		setFormData((prev) => ({ ...prev, [name]: value }))
	}

	async function uploadDocument(file, fieldName) {
		if (!file) return
		setUploadStats((prev) => ({ ...prev, [fieldName]: 'uploading' }))
		setError(null)

		try {
			const compressedFile = await imageCompression(file, {
				maxSizeMB: 0.8,
				maxWidthOrHeight: 1280,
				useWebWorker: true
			})

			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) throw new Error('Missing authenticated user.')

			const fileName = `${user.id}/${fieldName}_${Date.now()}.jpg`
			const { error: uploadError } = await supabase.storage
				.from('documents')
				.upload(fileName, compressedFile, {
					cacheControl: '3600',
					upsert: true
				})

			if (uploadError) throw uploadError

			const {
				data: { publicUrl }
			} = supabase.storage.from('documents').getPublicUrl(fileName)

			setFormData((prev) => ({
				...prev,
				[`${fieldName}_url`]: publicUrl
			}))
			setUploadStats((prev) => ({ ...prev, [fieldName]: 'done' }))
		} catch (err) {
			setError(`Failed to upload ${fieldName}. Please try again.`)
			setUploadStats((prev) => ({ ...prev, [fieldName]: 'idle' }))
		}
	}

	async function handleSubmit() {
		setLoading(true)
		setError(null)

		try {
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) throw new Error('Authentication expired.')

			const { error: updateError } = await supabase.from('riders').upsert(
				{
					user_id: user.id,
					...formData,
					status: 'pending',
					documents_submitted_at: new Date().toISOString()
				},
				{ onConflict: 'user_id' }
			)

			if (updateError) throw updateError

			setExistingStatus('pending')
		} catch (err) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	if (pageLoading) {
		return (
			<div className='min-h-[100dvh] bg-charcoal-950 flex items-center justify-center'>
				<Loader2 className='text-emerald-500 animate-spin' size={32} />
			</div>
		)
	}

	if (existingStatus) {
		const isApproved = existingStatus === 'approved'
		const isRejected = existingStatus === 'rejected'
		const isPaused = existingStatus === 'paused'

		return (
			<div className='min-h-[100dvh] bg-charcoal-950 flex flex-col items-center justify-center p-8 text-center'>
				<div className='w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-8 relative'>
					{isRejected || isPaused ? (
						<AlertCircle className='text-red-500' size={40} />
					) : (
						<CheckCircle2 className='text-emerald-500' size={40} />
					)}
				</div>
				<h2 className='text-2xl font-black text-white mb-4 font-outfit'>
					{isApproved
						? 'Your profile is active'
						: isRejected
							? 'Application not approved'
							: isPaused
								? 'Profile paused'
								: 'Application under review'}
				</h2>
				<p className='text-charcoal-400 text-sm leading-relaxed mb-8 max-w-xs'>
					{isApproved
						? 'You can review your rider profile or head back to the workspace.'
						: isRejected || isPaused
							? 'Please update your details and resubmit when ready.'
							: 'We have received your documents and are verifying them now.'}
				</p>

				<div className='w-full max-w-sm bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-left mb-8'>
					<div className='text-[10px] font-black text-charcoal-500 uppercase tracking-widest mb-3'>
						Verification Progress
					</div>
					<div className='space-y-3'>
						<div className='flex items-center gap-3 text-xs text-white font-bold'>
							<div className='w-1.5 h-1.5 bg-emerald-500 rounded-full' />
							Documents received
						</div>
						<div className='flex items-center gap-3 text-xs text-charcoal-500'>
							<div className='w-1.5 h-1.5 bg-charcoal-700 rounded-full' />
							Manual verification
						</div>
						<div className='flex items-center gap-3 text-xs text-charcoal-500'>
							<div className='w-1.5 h-1.5 bg-charcoal-700 rounded-full' />
							Profile activation
						</div>
					</div>
				</div>

				<button
					onClick={() => {
						setExistingStatus(null)
						setStep(1)
					}}
					className='w-full max-w-sm py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm hover:bg-white/10 transition-all mb-3'>
					Edit profile
				</button>
				<button
					onClick={() => router.push('/rider/dashboard')}
					className='w-full max-w-sm py-4 bg-emerald-500 text-charcoal-950 rounded-2xl font-black text-sm uppercase tracking-widest'>
					Go to dashboard
				</button>
			</div>
		)
	}

	return (
		<div className='min-h-[100dvh] bg-charcoal-950 flex flex-col'>
			<div className='px-6 pt-14 pb-8'>
				<div className='flex items-center gap-4 mb-6'>
					<button
						onClick={() => (step > 1 ? setStep((prev) => prev - 1) : router.back())}
						className='w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white'>
						<ArrowLeft size={18} />
					</button>
					<div>
						<h1 className='text-xl font-black text-white tracking-tight'>
							Rider Profile
						</h1>
						<p className='text-charcoal-500 text-xs font-medium'>
							Verify your profile to start earning
						</p>
					</div>
				</div>

				<div className='flex gap-2'>
					{STEPS.map((s) => (
						<div key={s.id} className='flex-1'>
							<div
								className={`h-1.5 rounded-full transition-all duration-500 ${
									step >= s.id ? 'bg-emerald-500' : 'bg-charcoal-800'
								}`}
							/>
							<div
								className={`text-[9px] mt-2 font-black uppercase tracking-widest ${
									step >= s.id ? 'text-emerald-500' : 'text-charcoal-600'
								}`}>
								{s.title}
							</div>
						</div>
					))}
				</div>
			</div>

			<div className='flex-1 px-6 pb-24 overflow-y-auto'>
				{step === 1 && (
					<div className='space-y-6'>
						<div>
							<label className='text-[10px] font-black text-charcoal-500 uppercase tracking-widest ml-1 mb-2 block'>
								Full Name
							</label>
							<input
								type='text'
								name='full_name'
								value={formData.full_name}
								onChange={handleInputChange}
								placeholder='As seen on your ID'
								className='w-full bg-charcoal-900 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder:text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40'
							/>
						</div>
						<div>
							<label className='text-[10px] font-black text-charcoal-500 uppercase tracking-widest ml-1 mb-2 block'>
								Phone Number
							</label>
							<input
								type='tel'
								name='phone'
								value={formData.phone}
								onChange={handleInputChange}
								placeholder='080XXXXXXXX'
								className='w-full bg-charcoal-900 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder:text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40'
							/>
						</div>
						<button
							onClick={() => setStep(2)}
							disabled={!formData.full_name || !formData.phone}
							className='w-full bg-emerald-500 hover:bg-emerald-400 text-charcoal-950 font-black py-4 rounded-2xl uppercase text-sm tracking-widest disabled:opacity-50'>
							Next
						</button>
					</div>
				)}

				{step === 2 && (
					<div className='space-y-6'>
						<div>
							<label className='text-[10px] font-black text-charcoal-500 uppercase tracking-widest ml-1 mb-2 block'>
								Vehicle Type
							</label>
							<select
								name='vehicle_type'
								value={formData.vehicle_type}
								onChange={handleInputChange}
								className='w-full bg-charcoal-900 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40'>
								<option value='bike'>Bike</option>
								<option value='car'>Car</option>
								<option value='van'>Van</option>
							</select>
						</div>
						<div>
							<label className='text-[10px] font-black text-charcoal-500 uppercase tracking-widest ml-1 mb-2 block'>
								Plate Number
							</label>
							<input
								type='text'
								name='plate_number'
								value={formData.plate_number}
								onChange={handleInputChange}
								placeholder='ABC-123'
								className='w-full bg-charcoal-900 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder:text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40'
							/>
						</div>
						<div>
							<label className='text-[10px] font-black text-charcoal-500 uppercase tracking-widest ml-1 mb-2 block'>
								Profile Photo
							</label>
							<input
								type='file'
								accept='image/*'
								onChange={(e) => uploadDocument(e.target.files?.[0], 'profile_photo')}
								className='hidden'
								id='profile-photo'
							/>
							<label
								htmlFor='profile-photo'
								className='w-full bg-charcoal-900 border border-white/10 rounded-2xl py-4 px-5 text-white flex items-center justify-between cursor-pointer'>
								<span className='text-charcoal-400'>Upload face photo</span>
								{uploadStats.profile_photo === 'done' ? (
									<CheckCircle2 size={18} className='text-emerald-500' />
								) : (
									<Camera size={18} className='text-charcoal-500' />
								)}
							</label>
						</div>
						<div className='grid grid-cols-2 gap-3'>
							<button
								onClick={() => setStep(1)}
								className='py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase text-xs tracking-widest'>
								Back
							</button>
							<button
								onClick={() => setStep(3)}
								className='py-4 bg-emerald-500 text-charcoal-950 rounded-2xl font-black uppercase text-xs tracking-widest'>
								Next
							</button>
						</div>
					</div>
				)}

				{step === 3 && (
					<div className='space-y-6'>
						{[
							['id_card_url', 'Government ID Card'],
							['license_url', 'Driver License'],
							['vehicle_photo_url', 'Vehicle Photo']
						].map(([field, label]) => (
							<div key={field}>
								<label className='text-[10px] font-black text-charcoal-500 uppercase tracking-widest ml-1 mb-2 block'>
									{label}
								</label>
								<input
									type='file'
									accept='image/*'
									onChange={(e) =>
										uploadDocument(e.target.files?.[0], field.replace('_url', ''))
									}
									className='hidden'
									id={field}
								/>
								<label
									htmlFor={field}
									className='w-full bg-charcoal-900 border border-white/10 rounded-2xl py-4 px-5 text-white flex items-center justify-between cursor-pointer'>
									<span className='text-charcoal-400'>
										{formData[field] ? 'Uploaded' : 'Upload file'}
									</span>
									{uploadStats[field.replace('_url', '')] === 'done' ? (
										<CheckCircle2 size={18} className='text-emerald-500' />
									) : (
										<Upload size={18} className='text-charcoal-500' />
									)}
								</label>
							</div>
						))}

						{error && (
							<div className='bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm'>
								{error}
							</div>
						)}

						<div className='grid grid-cols-2 gap-3'>
							<button
								onClick={() => setStep(2)}
								className='py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase text-xs tracking-widest'>
								Back
							</button>
							<button
								onClick={handleSubmit}
								disabled={loading}
								className='py-4 bg-emerald-500 text-charcoal-950 rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-50'>
								{loading ? (
									<Loader2 size={16} className='mx-auto animate-spin' />
								) : (
									'Submit'
								)}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
