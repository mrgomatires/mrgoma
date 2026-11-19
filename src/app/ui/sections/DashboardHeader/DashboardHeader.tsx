'use client';

import React from 'react';

import Image from 'next/image';

import { signOut, useSession } from 'next-auth/react';

import { useCart } from '@/app/context/CartContext';
import { ShoppingCart } from '@/app/ui/icons/ShoppingCart';

import { mrGomaLogoLight } from '#public/assets/images/Logo';

const DashboardHeader = () => {
  const { data: session } = useSession();
  const { cartCount, setShowCartModal } = useCart();
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'Administrator';

  return (
    <header className="w-full sticky top-0 z-40 bg-black border-b border-white/10 shadow-sm">
      <div className="absolute inset-0 bg-[#111]">
        <div className="absolute z-10 w-full h-full bg-linear-to-r from-black via-[#1A1A1A] to-[#9DFB40] opacity-80" />
        <Image src="/assets/images/bg-header.svg" alt="" fill className="object-cover" priority />
      </div>
      <nav
        aria-label="Dashboard navigation"
        className="relative z-10 mx-auto flex max-w-7xl items-center justify-between p-4"
      >
        <div className="w-full flex items-center justify-between gap-4 rounded-2xl bg-black/40 border border-white/10 px-4 py-2 shadow-sm backdrop-blur-md">
          <Image
            alt="MrGoma Tires logo"
            src={mrGomaLogoLight || '/placeholder.svg'}
            className="h-8 w-auto"
            priority
          />

          <span className="hidden sm:block text-sm text-white/70 font-medium">
            Welcome, <span className="text-white font-semibold">{userName}</span>
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCartModal(true)}
              className="flex items-center justify-center cursor-pointer rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              aria-label={`Shopping cart with ${cartCount} items`}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5" aria-hidden="true">
                  <span className="absolute inset-0 rounded-full bg-green-500 opacity-75 animate-ping" />
                  <span className="relative bg-green-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => signOut()}
              aria-label="Sign out"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-red-300/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors font-medium text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-3.5 h-3.5 shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default DashboardHeader;
