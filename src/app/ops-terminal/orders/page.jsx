import { validateAdmin } from '@/utils/admin'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import LiveOrdersFeed from './LiveOrdersFeed'

export const dynamic = 'force-dynamic'

const LIVE_STATUSES = [
  'pending',
  'matched',
  'assigned',
  'picked_up',
  'in_transit'
]

export default async function OpsOrdersPage() {
  let admin
  try {
    const result = await validateAdmin()
    admin = result.admin
  } catch {
    redirect('/')
  }

  const adminSupabase = createAdminClient()

  const { data: orders, error: ordersError } = await adminSupabase
    .from('orders')
    .select('*')
    .in('status', LIVE_STATUSES)
    .order('created_at', { ascending: false })

  if (ordersError) {
    console.error(
      '[ops-terminal/orders] Failed to fetch orders:',
      ordersError.message
    )
  }

  const orderRows = orders ?? []

  // Collect rider/vendor ids referenced by these orders
  const riderIds = [
    ...new Set(orderRows.map((o) => o.rider_id).filter(Boolean))
  ]
  const vendorIds = [
    ...new Set(orderRows.map((o) => o.vendor_id).filter(Boolean))
  ]

  const [ridersResult, vendorsResult] = await Promise.all([
    riderIds.length
      ? adminSupabase
          .from('riders')
          .select(
            'id, user_id, current_lat, current_lng, vehicle_type, plate_number'
          )
          .in('id', riderIds)
      : Promise.resolve({ data: [] }),
    vendorIds.length
      ? adminSupabase
          .from('vendors')
          .select('id, user_id, business_name')
          .in('id', vendorIds)
      : Promise.resolve({ data: [] })
  ])

  const riderRows = ridersResult.data ?? []
  const vendorRows = vendorsResult.data ?? []

  const userIds = [
    ...riderRows.map((r) => r.user_id),
    ...vendorRows.map((v) => v.user_id)
  ].filter(Boolean)

  const usersById = new Map()
  if (userIds.length > 0) {
    const { data: users } = await adminSupabase
      .from('users')
      .select('id, name, phone')
      .in('id', userIds)
    for (const u of users ?? []) {
      usersById.set(u.id, { name: u.name, phone: u.phone })
    }
  }

  const ridersById = new Map(
    riderRows.map((r) => [
      r.id,
      { ...r, users: usersById.get(r.user_id) ?? null }
    ])
  )
  const vendorsById = new Map(
    vendorRows.map((v) => [
      v.id,
      { ...v, users: usersById.get(v.user_id) ?? null }
    ])
  )

  const initialOrders = orderRows.map((order) => ({
    ...order,
    riders: order.rider_id ? ridersById.get(order.rider_id) ?? null : null,
    vendors: vendorsById.get(order.vendor_id) ?? null
  }))

  return (
    <div className='min-h-screen bg-black text-white p-8 font-mono'>
      <div className='flex justify-between items-end mb-8 border-b border-white/10 pb-8'>
        <div>
          <div className='flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase tracking-[0.3em] mb-2'>
            <div className='w-2 h-2 bg-emerald-500 rounded-full animate-pulse' />
            Live Telemetry Feed Active
          </div>
          <h1 className='text-3xl font-black italic tracking-tighter uppercase'>
            Traffic Control / Orders
          </h1>
        </div>
      </div>
      <LiveOrdersFeed initialOrders={initialOrders} adminId={admin.id} />
    </div>
  )
}
