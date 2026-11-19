import { SessionProvider } from 'next-auth/react';

import DashboardHeader from '@/app/ui/sections/DashboardHeader/DashboardHeader';
import { DashboardFooter } from '@/app/ui/sections/Footer/DashboardFooter';
import { auth } from '@/app/utils/authOptions';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The session client lives here, not in the root layout: only the dashboard
  // reads it (DashboardHeader's useSession / signOut), and at the root every
  // shopper downloaded it and fetched /api/auth/session (056). Access control
  // is server-side either way (src/proxy.ts).
  //
  // The session is read here, on the server, and handed to the provider
  // (058). Left to fetch it itself, next-auth 5 beta asked twice on every
  // visit: its first read announces itself on a new BroadcastChannel, and its
  // own "another tab changed the session" listener hears that and reads again.
  // With a session to start from it reads nothing on load; it still refreshes
  // when the tab regains focus (refetchOnWindowFocus, the default).
  const session = await auth();
  return (
    <SessionProvider session={session}>
      <div>
        <DashboardHeader />
        {children}
        <DashboardFooter />
      </div>
    </SessionProvider>
  );
}
