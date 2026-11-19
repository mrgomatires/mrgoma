import React, { Suspense } from 'react';

import type { Metadata, NextPage } from 'next';

import Checkout from '@/app/(shop)/checkout/container/Checkout/Checkout';
import LoadingScreen from '@/app/ui/components/LoadingScreen/LoadingScreen';
import { checkoutMetadata } from '@/app/utils/seo';

export const metadata: Metadata = checkoutMetadata();

const CheckoutPage: NextPage = () => {
  return (
    // The fallback holds the page's own frame (055): `LoadingScreen` takes no
    // room in the flow, so the footer painted right under the header and then
    // dropped when the checkout arrived — a 0.30–0.62 layout shift.
    <Suspense
      fallback={
        <main className="min-h-[70vh] bg-white">
          <LoadingScreen message="Loading your cart…" />
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <header className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Checkout
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Review your cart and complete your order.
              </p>
            </header>
          </div>
        </main>
      }
    >
      <Checkout />
    </Suspense>
  );
};

export default CheckoutPage;
