import { SessionProvider } from 'next-auth/react';

import DashboardHeader from '@/app/ui/sections/DashboardHeader/DashboardHeader';
import { DashboardFooter } from '@/app/ui/sections/Footer/DashboardFooter';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The session client lives here, not in the root layout: only the dashboard
  // reads it (DashboardHeader's useSession / signOut), and at the root every
  // shopper downloaded it and fetched /api/auth/session (056). Access control
  // is server-side either way (src/proxy.ts).
  return (
    <SessionProvider>
      <div>
        <DashboardHeader />
        {children}
        <DashboardFooter />
      </div>
    </SessionProvider>
  );
}
