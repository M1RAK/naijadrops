'use client'

import { useState } from 'react'
import { approveRider, deactivateRider } from './actions'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function DriverActions({ riderId, isApproved }) {
	const [loading, setLoading] = useState(false)
	const [approved, setApproved] = useState(isApproved)
	const [feedback, setFeedback] = useState(null)

	const handleApprove = async () => {
		if (!confirm('Approve this unit for active duty?')) return
		setLoading(true)
		setFeedback(null)
		const res = await approveRider(riderId)
		if (res.success) {
			setApproved(true)
			setFeedback({ type: 'success', msg: 'Approved' })
			setTimeout(() => setFeedback(null), 3000)
		} else {
			setFeedback({ type: 'error', msg: res.error || 'Action failed' })
		}
		setLoading(false)
	}

	const handleDeactivate = async () => {
		if (!confirm('Deactivate this unit? They will stop receiving jobs.'))
			return
		setLoading(true)
		setFeedback(null)
		const res = await deactivateRider(riderId)
		if (res.success) {
			setApproved(false)
			setFeedback({ type: 'success', msg: 'Deactivated' })
			setTimeout(() => setFeedback(null), 3000)
		} else {
			setFeedback({ type: 'error', msg: res.error || 'Action failed' })
		}
		setLoading(false)
	}

	if (loading) {
		return (
			<div className='flex items-center gap-2 text-[10px] text-emerald-500 font-black uppercase tracking-widest'>
				<Loader2 size={14} className='animate-spin' /> Processing...
			</div>
		)
	}

	if (feedback) {
		return (
			<div
				className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${
					feedback.type === 'success'
						? 'text-emerald-500'
						: 'text-red-500'
				}`}>
				{feedback.type === 'success' ? (
					<CheckCircle size={14} />
				) : (
					<XCircle size={14} />
				)}
				{feedback.msg}
			</div>
		)
	}

	return (
		<div className='flex gap-3 ml-auto'>
			{approved ? (
				<button
					onClick={handleDeactivate}
					className='px-5 py-3 rounded-xl bg-charcoal-800 border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all'>
					Deactivate
				</button>
			) : (
				<button
					onClick={handleApprove}
					className='px-5 py-3 rounded-xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]'>
					Approve Unit
				</button>
			)}
		</div>
	)
}
