import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // During build, env vars are not available.
    // Throw so callers can catch and return early rather than
    // receiving an incompatible mock that breaks TypeScript.
    throw new Error('Supabase credentials not configured.')
  }

  return createServerClient(
    url,
    key,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Called from a Server Component — safe to ignore,
            // middleware handles session refresh.
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Same as above.
          }
        },
      },
    }
  )
}
