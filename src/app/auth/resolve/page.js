import { redirect } from 'next/navigation'

/**
 * Legacy /resolve route — now superseded by /auth/resolve.
 * Kept as a redirect to avoid broken links from older sessions.
 */
export default function ResolvePage() {
	redirect('/auth/resolve')
}
