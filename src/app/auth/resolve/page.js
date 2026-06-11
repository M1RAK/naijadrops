import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

/**
 * /auth/resolve
 *
 * Central post-login router. Checks which profile rows exist
 * for the current user and sends them to the right portal.
 *
 * Logic:
 *   admin_users row exists → /ops-terminal/dashboard
 *   riders row (approved)  → /rider  (also has vendor access)
 *   riders row (pending)   → /rider  (shows pending state in layout)
 *   vendors row only       → /dashboard
 *   nothing yet            → /dashboard (trigger should have created vendor row)
 */
export default async function AuthResolvePage() {
  let supabase
  try {
    supabase = await createClient()
  } catch {
    redirect('/auth/login')
  }

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Check admin first — fastest gate
  const { data: adminRecord } = await supabase
    .from('admin_users')
    .select('id, is_active')
    .eq('id', user.id)
    .single()

  if (adminRecord?.is_active) {
    redirect('/ops-terminal/dashboard')
  }

  // Check for rider profile
  const { data: riderProfile } = await supabase
    .from('riders')
    .select('id, status')
    .eq('user_id', user.id)
    .single()

  if (riderProfile) {
    redirect('/rider')
  }

  // Default — vendor portal
  // (vendor row guaranteed by auth trigger, but safe to fall through regardless)
  redirect('/dashboard')
}
