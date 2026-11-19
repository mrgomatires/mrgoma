import React from 'react';

import CompareTray from '@/app/ui/sections/CompareTray/CompareTray';
import { Footer } from '@/app/ui/sections/Footer/Footer';
import StickyHeader from '@/app/ui/sections/StickyHeader/StickyHeader';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <StickyHeader />
      {children}
      <Footer />
      {/* Tires picked to compare (051): store pages only, not the dashboard. */}
      <CompareTray />
    </div>
  );
}
