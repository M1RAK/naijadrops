'use client'

export default function OpsTerminalError({ error, reset }) {
	return (
		<div className='min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center font-mono'>
			<div className='w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6'>
				<span className='text-red-500 text-3xl font-black'>!</span>
			</div>
			<h2 className='text-xl font-black uppercase tracking-widest mb-2'>
				Terminal Error
			</h2>
			<p className='text-charcoal-500 text-sm mb-6 max-w-md wrap-break-word'>
				{error?.message || 'Something went wrong loading this view.'}
			</p>
			<button
				onClick={reset}
				className='bg-emerald-500 text-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest'>
				Retry
			</button>
		</div>
	)
}
