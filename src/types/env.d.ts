declare namespace NodeJS {
	interface ProcessEnv {
		// Supabase
		NEXT_PUBLIC_SUPABASE_URL: string
		NEXT_PUBLIC_SUPABASE_ANON_KEY: string
		SUPABASE_SERVICE_ROLE_KEY: string

		// Mapbox
		NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: string

		// Paystack
		NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: string
		PAYSTACK_SECRET_KEY: string

		// App
		NEXT_PUBLIC_SITE_URL: string
	}
}
