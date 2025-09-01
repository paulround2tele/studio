import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { SESSION_CONFIG } from '@/lib/constants';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const hasSession = !!cookieStore.get(SESSION_CONFIG.SESSION_COOKIE_NAME)?.value;
  if (!hasSession) redirect('/login');
  return <DashboardClient />;
}