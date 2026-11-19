import React from 'react';

import Footer from '@/app/ui/sections/Footer/Footer';
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
    </div>
  );
}
