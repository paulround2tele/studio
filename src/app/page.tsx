import { redirect as _redirect, permanentRedirect } from 'next/navigation';

export default function HomePage() {
  // If the request made it here, either:
  // - User is authenticated (middleware lets through) → redirect to /dashboard
  // - Or middleware is disabled; still send users to dashboard for consistency
  permanentRedirect('/dashboard');
}
