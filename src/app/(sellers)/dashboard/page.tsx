import { Suspense } from 'react';

import type { Metadata } from 'next';

import Dashboard from '@/app/(sellers)/dashboard/container/Dashboard';
import LoadingScreen from '@/app/ui/components/LoadingScreen/LoadingScreen';

export const metadata: Metadata = {
  // "Dashboard | MrGoma Tires" through the root template — it used to show the
  // storefront's default title, the same as any shop tab (059).
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

const Page = () => {
  return (
    <div className="p-4 sm:p-8 bg-gray-50/50 min-h-screen">
      <Suspense fallback={<LoadingScreen message="Loading Dashboard..." />}>
        <Dashboard />
      </Suspense>
    </div>
  );
};

export default Page;
