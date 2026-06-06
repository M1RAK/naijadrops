import { createBrowserClient } from '@supabase/ssr'

/**
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn(
      'Supabase credentials missing. Returning mock client for build safety.'
    )

    const mockChannel = {
      on: () => mockChannel,
      subscribe: async () => mockChannel
    }

    const mockClient = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } }
        })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null })
          })
        })
      }),
      channel: () => mockChannel,
      removeChannel: async () => mockChannel
    }

    return /** @type {any} */ (mockClient)
  }

  return createBrowserClient(url, key)
}
