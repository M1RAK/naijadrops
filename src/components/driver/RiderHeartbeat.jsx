'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { APP_CONFIG } from '@/utils/constants'

/**
 * RiderHeartbeat — mounts silently in the rider workspace layout.
 *
 * Every HEARTBEAT_INTERVAL_MS (35s) and on each meaningful GPS position
 * change, writes current_lat / current_lng / last_seen_at to the riders row.
 *
 * Only fires when the rider is approved and online — avoids polluting
 * last_seen_at for pending/paused riders, which would make them visible
 * to the dispatch engine's active-window filter.
 *
 * riderId  — riders.id (PK), NOT user_id
 * isOnline — riders.operational_status === 'online'
 */
export default function RiderHeartbeat({ riderId, isOnline }) {
	const supabase = createClient()
	const lastPositionRef = useRef(null)
	const watchIdRef = useRef(null)
	const intervalRef = useRef(null)

	useEffect(() => {
		if (!riderId || !isOnline) return

		async function writeLocation(lat, lng) {
			const last = lastPositionRef.current

			// Skip full update if position hasn't moved meaningfully (~10m)
			// but still bump last_seen_at so dispatch knows rider is present
			if (
				last &&
				Math.abs(last.lat - lat) < 0.0001 &&
				Math.abs(last.lng - lng) < 0.0001
			) {
				await supabase
					.from('riders')
					.update({ last_seen_at: new Date().toISOString() })
					.eq('id', riderId)
				return
			}

			lastPositionRef.current = { lat, lng }

			await supabase
				.from('riders')
				.update({
					current_lat: lat,
					current_lng: lng,
					last_seen_at: new Date().toISOString()
				})
				.eq('id', riderId)
		}

		function onPosition(pos) {
			writeLocation(pos.coords.latitude, pos.coords.longitude)
		}

		function onPositionError(err) {
			console.warn('[heartbeat] GPS unavailable:', err.message)
		}

		// 1. GPS watch — fires on meaningful position changes immediately
		if ('geolocation' in navigator) {
			watchIdRef.current = navigator.geolocation.watchPosition(
				onPosition,
				onPositionError,
				{
					enableHighAccuracy: true,
					maximumAge: 15000,
					timeout: 10000
				}
			)
		}

		// 2. Interval fallback — keeps last_seen_at fresh when stationary
		intervalRef.current = setInterval(async () => {
			if ('geolocation' in navigator) {
				navigator.geolocation.getCurrentPosition(
					onPosition,
					async () => {
						if (lastPositionRef.current) {
							await writeLocation(
								lastPositionRef.current.lat,
								lastPositionRef.current.lng
							)
						} else {
							await supabase
								.from('riders')
								.update({ last_seen_at: new Date().toISOString() })
								.eq('id', riderId)
						}
					},
					{ enableHighAccuracy: false, maximumAge: 30000, timeout: 5000 }
				)
			}
		}, APP_CONFIG.HEARTBEAT_INTERVAL_MS)

		return () => {
			if (watchIdRef.current !== null) {
				navigator.geolocation.clearWatch(watchIdRef.current)
				watchIdRef.current = null
			}
			if (intervalRef.current !== null) {
				clearInterval(intervalRef.current)
				intervalRef.current = null
			}
		}
	}, [riderId, isOnline])

	return null
}
